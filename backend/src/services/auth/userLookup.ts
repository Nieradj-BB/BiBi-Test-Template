import { Prisma } from "@prisma/client";

import { ApiError } from "../../middleware/errorHandler";

/** What the app needs per user to let someone in. */
export const AUTH_FIELDS = {
  id: true,
  authId: true,
  email: true,
  name: true,
  roles: true,
  active: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{ select: typeof AUTH_FIELDS }>;

/** Email addresses are compared without case and surrounding spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The users with this email address, ignoring case. The database does the
 * rough selection; the exact comparison happens here, so `_` or `%` in an
 * address never acts as a wildcard.
 */
export async function findByEmail(
  db: Pick<Prisma.TransactionClient, "user">,
  email: string,
): Promise<AuthUser[]> {
  const wanted = normalizeEmail(email);
  if (wanted === "") return [];
  const rows = await db.user.findMany({
    where: { email: { equals: wanted, mode: "insensitive" } },
    select: AUTH_FIELDS,
  });
  return rows.filter((row) => normalizeEmail(row.email) === wanted);
}

/** With two rows for one address we do not guess which one is meant. */
export function duplicateAccount(): ApiError {
  return new ApiError(
    409,
    "DUPLICATE_ACCOUNT",
    "Er zijn twee accounts met dit e-mailadres. Vraag een beheerder om dat op te lossen.",
  );
}

export function deactivated(): ApiError {
  return new ApiError(403, "FORBIDDEN", "Dit account is gedeactiveerd");
}
