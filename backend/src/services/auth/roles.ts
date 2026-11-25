/**
 * The roles of the app. Everyone who can sign in is a user; an admin has both
 * roles: `["user", "admin"]`. Add app-specific roles here.
 */
export const ROLE_USER = "user";
export const ROLE_ADMIN = "admin";

export type Role = typeof ROLE_USER | typeof ROLE_ADMIN;

/** The roles of an account created at its first sign-in. */
export const NEW_ACCOUNT_ROLES: Role[] = [ROLE_USER];
