import { errors, jwtVerify } from "jose";
import { z } from "zod";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { ApiError } from "../../middleware/errorHandler";
import { errorInfo } from "../../utils/errorInfo";
import { supabaseKeys } from "./supabaseKeys";

/** Who a Supabase token says someone is: only what the app needs. */
export interface SupabaseIdentity {
  /** `sub`: the id in Supabase (`auth.users.id`). */
  authId: string;
  email: string | null;
  /** From `app_metadata`, which only Supabase itself sets. */
  provider: string | null;
  /** Signed in with Microsoft only (no other linked provider). */
  viaMicrosoft: boolean;
  /** The name from Microsoft, only right after a Microsoft sign-in. */
  nameAfterSignIn: string | null;
  /** The session started with a Microsoft sign-in at most two minutes ago. */
  freshSignIn: boolean;
}

const claims = z.object({
  sub: z.uuid(),
  email: z.string().optional(),
  is_anonymous: z.boolean().optional(),
  // Parsed leniently below: an unexpected shape must not invalidate the token.
  amr: z.unknown().optional(),
  app_metadata: z
    .object({
      provider: z.string().optional(),
      providers: z.unknown().optional(),
    })
    .optional(),
  // Supabase fills only `full_name` for Microsoft; `name` is set by the user.
  user_metadata: z.object({ full_name: z.string().optional() }).optional(),
});

/** Errors about the token itself: a 401, not an outage. */
const TOKEN_ERRORS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
];

const MAX_NAME = 200;

/**
 * How long after a Microsoft sign-in the app takes over the name and may
 * create a new account. Measured at the time of the request: a token stays
 * valid for an hour.
 */
const FRESH_SIGN_IN_S = 120;

const amrEntry = z.object({ method: z.string(), timestamp: z.number() });

const MICROSOFT = "azure";
const onlyMicrosoft = z.array(z.literal(MICROSOFT)).nonempty();

/**
 * Microsoft is the provider, no other provider is linked, and the session
 * started with OAuth. `app_metadata.provider` is the provider the account
 * started with, not how this session signed in, hence the extra checks.
 */
function signedInWithMicrosoft(
  provider: string | undefined,
  providers: unknown,
  amr: unknown,
): boolean {
  if (provider !== MICROSOFT) return false;
  if (providers !== undefined && !onlyMicrosoft.safeParse(providers).success) {
    return false;
  }
  if (amr === undefined) return true;
  return (
    Array.isArray(amr) &&
    amr.some((entry) => amrEntry.safeParse(entry).data?.method === "oauth")
  );
}

function freshAfterOAuth(amr: unknown, now: number): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    const parsed = amrEntry.safeParse(entry);
    return (
      parsed.success &&
      parsed.data.method === "oauth" &&
      now - parsed.data.timestamp <= FRESH_SIGN_IN_S
    );
  });
}

/** At most `MAX_NAME` characters, on whole characters: never half an emoji. */
function limit(name: string): string {
  return Array.from(name).slice(0, MAX_NAME).join("").trim();
}

function invalid(): ApiError {
  return new ApiError(401, "UNAUTHORIZED", "Ongeldige of verlopen sessie");
}

/** An expired token is normal (the frontend refreshes it); the rest is worth a warning. */
function logRejection(err: unknown): void {
  if (err instanceof errors.JWTExpired) return;
  logger.warn(
    {
      error: err instanceof errors.JOSEError ? err.code : "unknown",
      claim:
        err instanceof errors.JWTClaimValidationFailed ? err.claim : undefined,
    },
    "Supabase token rejected",
  );
}

let reportedMissingSupabase = false;
function reportMissingSupabase(): void {
  if (reportedMissingSupabase) return;
  reportedMissingSupabase = true;
  logger.warn(
    "SUPABASE_URL is empty: Microsoft sign-in is off and every Supabase token is rejected",
  );
}

/**
 * Verifies a Supabase access token against the project's public keys: ES256
 * only, the project's issuer, audience `authenticated` and a required expiry.
 * An invalid token is a 401; unreachable keys are a 500 `AUTH_UNAVAILABLE`, so
 * the frontend does not sign anyone out because of an outage.
 */
export async function verifySupabaseToken(
  token: string,
): Promise<SupabaseIdentity> {
  const supabaseUrl = env.SUPABASE_URL;
  if (!supabaseUrl) {
    reportMissingSupabase();
    throw invalid();
  }

  let payload: unknown;
  try {
    ({ payload } = await jwtVerify(token, supabaseKeys(supabaseUrl), {
      algorithms: ["ES256"],
      issuer: new URL("/auth/v1", supabaseUrl).href,
      audience: "authenticated",
      requiredClaims: ["sub", "exp"],
    }));
  } catch (err) {
    if (TOKEN_ERRORS.some((kind) => err instanceof kind)) {
      logRejection(err);
      throw invalid();
    }
    // Never the token in the log: only the kind of error and its location.
    logger.error({ error: errorInfo(err) }, "Supabase keys unreachable");
    throw new ApiError(
      500,
      "AUTH_UNAVAILABLE",
      "Inloggen kan nu niet worden gecontroleerd. Probeer het zo opnieuw.",
    );
  }

  const parsed = claims.safeParse(payload);
  if (!parsed.success || parsed.data.is_anonymous === true) {
    logger.warn(
      { error: parsed.success ? "anonymous" : "claims" },
      "Supabase token rejected",
    );
    throw invalid();
  }
  const { sub, email, amr, app_metadata, user_metadata } = parsed.data;
  const name = limit(user_metadata?.full_name?.trim() ?? "") || null;
  const fresh = freshAfterOAuth(amr, Math.floor(Date.now() / 1000));
  return {
    authId: sub,
    email: email?.trim() ? email.trim() : null,
    provider: app_metadata?.provider ?? null,
    viaMicrosoft: signedInWithMicrosoft(
      app_metadata?.provider,
      app_metadata?.providers,
      amr,
    ),
    nameAfterSignIn: fresh ? name : null,
    freshSignIn: fresh,
  };
}
