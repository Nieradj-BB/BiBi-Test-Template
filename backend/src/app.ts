import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";
import { ApiError, errorHandler } from "./middleware/errorHandler";
import { defaultRateLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";

/**
 * The app without `listen`: `index.ts` starts it in production, `dev/server.ts`
 * locally and in a Codespace, and tests call it directly.
 */
export const app = express();

/* Behind the platform's proxy: `req.ip` comes from X-Forwarded-For. One
   trusted hop, not `true`: that would let a client invent its own
   X-Forwarded-For. On DigitalOcean App Platform that header holds the
   platform's ingress, so the rate limiter reads CLIENT_IP_HEADER there. */
app.set("trust proxy", 1);

app.use(helmet());
// The Supabase token travels as a Bearer header, not as a cookie.
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

/* Health checks before the limiter: the platform's readiness polls must not
   use up the budget of users. */
app.use("/health", healthRouter);

app.use(defaultRateLimit);

// An unknown API route gets the same error shape as everything else.
const notFound: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, "NOT_FOUND", "Deze route bestaat niet"));
};

/* Public API routes go above the gate, and only on purpose. /api/auth/me
   checks the sign-in itself; the rest of /api/auth is a 404 (the CI checks
   that the dev login is one in a build). */
app.use("/api/auth", authRouter, notFound);

/* The gate: every API route below needs a signed-in user, so a new router is
   closed by default. Admin-only routes add `requireRole(ROLE_ADMIN)`. */
app.use("/api", requireAuth);
// Mount the app's own routers here: app.use("/api/<resource>", <resource>Router).

// Behind the gate, so without a sign-in an unknown route is a 401 as well.
app.use("/api", notFound);

app.use(errorHandler);
