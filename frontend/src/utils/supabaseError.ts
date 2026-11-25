import {
  isAuthError,
  isAuthImplicitGrantRedirectError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

const DEFAULT = "Inloggen is niet gelukt. Probeer het opnieuw.";
const TOO_OFTEN =
  "Te veel inlogpogingen. Probeer het over een paar minuten opnieuw.";
const NOT_ALLOWED =
  "Nieuwe accounts zijn nog niet toegestaan. Vraag een beheerder om het na te kijken.";

/** Per Supabase Auth error code the message for the user. */
const MESSAGES = new Map<string, string>([
  ["user_banned", "Dit account is geblokkeerd. Vraag een beheerder om hulp."],
  ["over_request_rate_limit", TOO_OFTEN],
  ["signup_disabled", NOT_ALLOWED],
  ["request_timeout", "Inloggen duurde te lang. Probeer het opnieuw."],
]);

const RETURN_DEFAULT =
  "Inloggen met Microsoft is niet gelukt. Probeer het opnieuw; lukt het niet, vraag dan een beheerder om het na te kijken.";

/** Back from Microsoft with an error in the URL: first the exact code, then the kind. */
const RETURN_MESSAGES = new Map<string, string>([
  ["signup_disabled", NOT_ALLOWED],
  [
    "access_denied",
    "Inloggen met Microsoft is afgebroken of geweigerd. Probeer het opnieuw; lukt het niet, vraag dan een beheerder om het na te kijken.",
  ],
  [
    "provider_email_needs_verification",
    "Microsoft gaf je e-mailadres niet als bevestigd door. Vraag een beheerder om het na te kijken.",
  ],
]);

/**
 * The message for a Supabase Auth error. Supabase's English text is never
 * shown: it is not written for users.
 */
export function supabaseError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Inloggen lukt nu niet: Supabase is niet bereikbaar. Controleer je verbinding en probeer het opnieuw.";
  }
  if (isAuthImplicitGrantRedirectError(error)) {
    const { code, error: kind } = error.details ?? {};
    return (
      (code ? RETURN_MESSAGES.get(code) : undefined) ??
      (kind ? RETURN_MESSAGES.get(kind) : undefined) ??
      RETURN_DEFAULT
    );
  }
  if (!isAuthError(error)) return DEFAULT;
  const message = error.code ? MESSAGES.get(error.code) : undefined;
  if (message) return message;
  return error.status === 429 ? TOO_OFTEN : DEFAULT;
}
