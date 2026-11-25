import express, { type Express } from "express";
import { z } from "zod";

import { APP_SLUG } from "../src/config/app";
import { logger } from "../src/config/logger";
import { prisma } from "../src/config/prisma";
import { ApiError, errorHandler } from "../src/middleware/errorHandler";
import { ROLE_ADMIN, ROLE_USER, type Role } from "../src/services/auth/roles";
import { AUTH_FIELDS } from "../src/services/auth/userLookup";
import {
  localSession,
  SESSION_COOKIE,
  SESSION_DURATION_S,
  signDevSession,
} from "./devSession";

/**
 * The two test accounts of the dev login. The `.test` domain does not exist,
 * so no Microsoft account can ever sign in with these addresses.
 */
export const TEST_ACCOUNTS = {
  [ROLE_USER]: {
    email: `user@${APP_SLUG}.test`,
    name: "Test Gebruiker",
    roles: [ROLE_USER],
  },
  [ROLE_ADMIN]: {
    email: `admin@${APP_SLUG}.test`,
    name: "Test Beheerder",
    roles: [ROLE_USER, ROLE_ADMIN],
  },
} as const satisfies Record<
  Role,
  { email: string; name: string; roles: readonly Role[] }
>;

// Other fields (such as an email address or a name) are dropped.
const devLoginSchema = z.object({
  role: z.enum([ROLE_USER, ROLE_ADMIN]),
});

const OWN_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * The dev server's app: the real `app`, wrapped with the dev login.
 * `POST /api/auth/dev-login` with `{ role }` creates that role's test account
 * if needed, sets its roles and returns a cookie; `middleware/auth.ts` knows
 * that cookie through `app.locals`.
 *
 * With `ownHostOnly` (on a laptop, see `checkLocation`) the server refuses
 * every request with another Host header. So a website that points its domain
 * at 127.0.0.1 (DNS rebinding) cannot become admin with one click.
 */
export function withDevLogin(
  app: Express,
  { ownHostOnly = false }: { ownHostOnly?: boolean } = {},
): Express {
  app.locals.localSession = localSession;

  const dev = express();
  if (ownHostOnly) {
    dev.use((req, _res, next) => {
      if (OWN_HOSTS.has(req.hostname)) {
        next();
        return;
      }
      logger.warn({}, "Request with a foreign Host refused");
      next(
        new ApiError(403, "UNKNOWN_HOST", "Alleen bereikbaar via localhost"),
      );
    });
  }

  dev.post("/api/auth/dev-login", express.json(), async (req, res, next) => {
    try {
      const { role } = devLoginSchema.parse(req.body);
      const account = TEST_ACCOUNTS[role];

      // Roles follow the button; name and `active` stay as they are.
      const user = await prisma.user.upsert({
        where: { email: account.email },
        create: {
          email: account.email,
          name: account.name,
          roles: [...account.roles],
        },
        update: { roles: [...account.roles] },
        select: AUTH_FIELDS,
      });
      if (!user.active) {
        throw new ApiError(403, "FORBIDDEN", "Dit account is gedeactiveerd");
      }

      res.cookie(SESSION_COOKIE, await signDevSession(user.id), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_DURATION_S * 1000,
      });
      logger.info({ user: user.id, role }, "Dev login");
      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /** Clears the cookie; the frontend clears a Supabase session itself. */
  dev.post("/api/auth/dev-logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax" });
    res.status(204).send();
  });

  dev.use(app);
  // Only for errors from the two routes above; `app` has its own handler.
  dev.use(errorHandler);
  return dev;
}
