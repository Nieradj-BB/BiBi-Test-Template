import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { logger } from "../config/logger";
import type { Role } from "../services/auth/roles";
import { userForSupabase } from "../services/auth/supabaseUser";
import { verifySupabaseToken } from "../services/auth/supabaseToken";
import { type AuthUser, deactivated } from "../services/auth/userLookup";
import { ApiError } from "./errorHandler";

/** Who is signed in, as routes and `/api/auth/me` see it. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

/**
 * A second source of sessions, only for the dev login on a development machine
 * or in a Codespace. Only `dev/server.ts` sets it, on `app.locals`; a build
 * never has it. `null`: no session of this kind in the request.
 */
export type LocalSession = (req: Request) => Promise<AuthUser | null>;

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
  interface Locals {
    localSession?: LocalSession;
  }
}

function notSignedIn(): ApiError {
  return new ApiError(401, "UNAUTHORIZED", "Niet ingelogd");
}

function invalidSession(): ApiError {
  return new ApiError(401, "UNAUTHORIZED", "Ongeldige of verlopen sessie");
}

/** The token from "Authorization: Bearer <token>"; any other shape is a 401. */
function bearerToken(header: string): string {
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    throw invalidSession();
  }
  return token;
}

/**
 * Who makes the request. With a Bearer header that is Supabase, and final.
 * Without one, only the dev server's local session counts, and never with
 * NODE_ENV=production. A database error passes through unchanged: that is a
 * 500, not a sign-out.
 */
async function userFromRequest(req: Request): Promise<AuthUser> {
  const header = req.get("authorization");
  if (header !== undefined) {
    const identity = await verifySupabaseToken(bearerToken(header));
    return userForSupabase(identity);
  }

  const local: LocalSession | undefined = req.app.locals.localSession;
  if (local && env.NODE_ENV !== "production") {
    const user = await local(req);
    if (user) return user;
  }
  throw notSignedIn();
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Roles and `active` come from the database per request, not from the
    // token: a revoked role or a deactivated account takes effect at once.
    const user = await userFromRequest(req);
    if (!user.active) throw deactivated();
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** After `requireAuth`: only users with this role. */
export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user?.roles.includes(role)) {
      next();
      return;
    }
    // Log refused access with ids only: no name or email address.
    logger.warn(
      { user: req.user?.id, role, method: req.method, path: req.originalUrl },
      "Access refused",
    );
    next(new ApiError(403, "FORBIDDEN", "Je hebt hier geen toegang toe"));
  };
}
