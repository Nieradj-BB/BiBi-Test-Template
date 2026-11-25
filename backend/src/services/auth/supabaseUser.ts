import { Prisma } from "@prisma/client";

import { APP_NAME } from "../../config/app";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { NEW_ACCOUNT_ROLES } from "./roles";
import type { SupabaseIdentity } from "./supabaseToken";
import {
  AUTH_FIELDS,
  type AuthUser,
  deactivated,
  duplicateAccount,
  findByEmail,
  normalizeEmail,
} from "./userLookup";

function noAccess(): ApiError {
  return new ApiError(
    403,
    "NO_ACCESS",
    `Je account heeft geen toegang tot ${APP_NAME}. Log in met je Microsoft-account; lukt dat niet, vraag dan een beheerder om het na te kijken.`,
  );
}

function signInAgain(): ApiError {
  return new ApiError(
    403,
    "SIGN_IN_AGAIN",
    `Je hebt nog geen account in ${APP_NAME}. Log uit en log opnieuw in met Microsoft; dan krijg je er vanzelf een.`,
  );
}

function alreadyLinked(): ApiError {
  return new ApiError(
    409,
    "ALREADY_LINKED",
    "Dit e-mailadres hoort al bij een ander account. Vraag een beheerder om het na te kijken.",
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * The app user for a valid Supabase token:
 * 1. known by Supabase id;
 * 2. otherwise, only for a Microsoft sign-in, linked by email address if that
 *    account has no other link and is active;
 * 3. otherwise, only right after a Microsoft sign-in, a new account with
 *    `NEW_ACCOUNT_ROLES`; an older session must sign in again first, so a
 *    running session cannot bring back a deleted account;
 * 4. otherwise no access (403).
 * Whether the user is active is checked by the middleware. Two concurrent
 * first requests collide on a unique key; then we look up once more.
 */
export async function userForSupabase(
  identity: SupabaseIdentity,
): Promise<AuthUser> {
  try {
    return await findOrLink(identity);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  try {
    return await findOrLink(identity);
  } catch (err) {
    if (isUniqueViolation(err)) throw alreadyLinked();
    throw err;
  }
}

async function findOrLink(identity: SupabaseIdentity): Promise<AuthUser> {
  const { authId } = identity;
  const known = await prisma.user.findUnique({
    where: { authId },
    select: AUTH_FIELDS,
  });
  if (known) return updateName(known, identity.nameAfterSignIn);

  const email = normalizeEmail(identity.email ?? "");
  if (!identity.viaMicrosoft || email === "") {
    // Only ids in the log: no name or email address.
    logger.warn(
      { authId, provider: identity.provider },
      "Sign-in without access to the app refused",
    );
    throw noAccess();
  }

  const rows = await findByEmail(prisma, email);
  if (rows.length > 1) throw duplicateAccount();
  const [row] = rows;
  if (row) {
    return updateName(await link(row, authId), identity.nameAfterSignIn);
  }

  if (!identity.freshSignIn) {
    logger.warn({ authId }, "New account only after a fresh sign-in");
    throw signInAgain();
  }
  return create(identity, email);
}

/** Rule 2: an existing account (created by an admin, or earlier) gets the Supabase id. */
async function link(row: AuthUser, authId: string): Promise<AuthUser> {
  if (row.authId && row.authId !== authId) {
    logger.warn(
      { user: row.id, authId },
      "Sign-in belongs to another account; not linked",
    );
    throw alreadyLinked();
  }
  if (!row.active) throw deactivated();
  // Conditional: of two concurrent requests, only one links.
  const { count } = await prisma.user.updateMany({
    where: { id: row.id, authId: null },
    data: { authId },
  });
  if (count === 1) {
    logger.info({ user: row.id, authId }, "Sign-in linked to account");
    return { ...row, authId };
  }
  const now = await prisma.user.findUnique({
    where: { authId },
    select: AUTH_FIELDS,
  });
  if (now) return now;
  throw alreadyLinked();
}

/**
 * Right after a Microsoft sign-in the name follows Microsoft. Only then: later
 * the user can change `user_metadata` themselves. Conditional, so of two
 * concurrent requests only one writes.
 */
async function updateName(
  user: AuthUser,
  name: string | null,
): Promise<AuthUser> {
  if (name === null || name === user.name || !user.active) return user;
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, name: user.name },
    data: { name },
  });
  if (count === 0) return user;
  logger.info({ user: user.id }, "Name updated from Microsoft");
  return { ...user, name };
}

/** Rule 3: a Microsoft account without an account in the app. */
async function create(
  identity: SupabaseIdentity,
  email: string,
): Promise<AuthUser> {
  const user = await prisma.user.create({
    data: {
      authId: identity.authId,
      email,
      name: identity.nameAfterSignIn ?? email,
      roles: [...NEW_ACCOUNT_ROLES],
    },
    select: AUTH_FIELDS,
  });
  logger.info(
    { user: user.id, authId: identity.authId },
    "Account created at the first Microsoft sign-in",
  );
  return user;
}
