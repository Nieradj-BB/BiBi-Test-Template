import { isIP } from "node:net";

import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env";

/**
 * The client's IP address. On DigitalOcean App Platform `req.ip` is the
 * address of DigitalOcean's ingress, the same for every user; the platform
 * puts the client's address in its own header (CLIENT_IP_HEADER). A value
 * that is not an IP address falls back to `req.ip`.
 */
export function clientIp(req: Request, header: string | undefined): string {
  const fromHeader = header ? req.get(header)?.trim() : undefined;
  if (fromHeader && isIP(fromHeader)) return fromHeader;
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/**
 * The limit for every API route, per client address. Mounted after /health in
 * app.ts, so the platform's readiness polls do not use up the budget of users.
 * Add stricter limiters per route (keyed on `req.user?.id`) for expensive
 * endpoints.
 */
export const defaultRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // IPv6 addresses count per /56 block, so one machine cannot rotate addresses.
  keyGenerator: (req) => ipKeyGenerator(clientIp(req, env.CLIENT_IP_HEADER)),
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Te veel verzoeken. Probeer het over een paar minuten opnieuw.",
    },
  },
});
