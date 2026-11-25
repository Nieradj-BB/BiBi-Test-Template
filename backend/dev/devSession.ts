import { jwtVerify, SignJWT } from "jose";

import { APP_SLUG } from "../src/config/app";
import { prisma } from "../src/config/prisma";
import type { LocalSession } from "../src/middleware/auth";
import { ApiError } from "../src/middleware/errorHandler";
import { AUTH_FIELDS } from "../src/services/auth/userLookup";
import { readCookie } from "../src/utils/cookies";
import { loadDevConfig } from "./devConfig";

/**
 * The dev login session: an httpOnly cookie with a token signed with
 * DEV_LOGIN_SECRET. Its own issuer and audience, so no other token signed with
 * the same secret is valid here. The cookie name includes the app, because
 * cookies are scoped per host, not per port: another local app would collide.
 */
export const SESSION_COOKIE = `${APP_SLUG}_dev_session`;
export const SESSION_DURATION_S = 60 * 60 * 8;

export const SESSION_ISSUER = `${APP_SLUG}-dev`;
export const SESSION_AUDIENCE = "dev-login";

function secret(): Uint8Array {
  const config = loadDevConfig();
  if (!config.enabled) throw new Error("The dev login is off");
  return new TextEncoder().encode(config.secret);
}

/** A session for this user id, valid for 8 hours. */
export function signDevSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(secret());
}

/** The user id from a valid session; throws for an invalid or expired one. */
export async function readDevSession(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret(), {
    algorithms: ["HS256"],
    issuer: SESSION_ISSUER,
    audience: SESSION_AUDIENCE,
    requiredClaims: ["sub", "exp"],
  });
  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new Error("Session without an account");
  }
  return payload.sub;
}

function invalidSession(): ApiError {
  return new ApiError(401, "UNAUTHORIZED", "Ongeldige of verlopen sessie");
}

/**
 * The hook for `middleware/auth.ts`: the account of the cookie, found by id,
 * never by a Supabase id. No cookie: `null`. An invalid cookie or a missing
 * account: 401.
 */
export const localSession: LocalSession = async (req) => {
  const cookie = readCookie(req.get("cookie"), SESSION_COOKIE);
  if (!cookie) return null;
  let id: string;
  try {
    id = await readDevSession(cookie);
  } catch {
    throw invalidSession();
  }
  const user = await prisma.user.findFirst({
    where: { id },
    select: AUTH_FIELDS,
  });
  if (!user) throw invalidSession();
  return user;
};
