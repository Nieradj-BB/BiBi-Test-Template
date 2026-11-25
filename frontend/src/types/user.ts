/** The roles of the app; the backend's `services/auth/roles.ts` is the source. */
export const ROLE_USER = "user";
export const ROLE_ADMIN = "admin";

export type Role = typeof ROLE_USER | typeof ROLE_ADMIN;

/** Who is signed in, as `GET /api/auth/me` returns it. */
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}
