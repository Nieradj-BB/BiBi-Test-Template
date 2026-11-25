import type { Express } from "express";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";

/**
 * Starts the server: in production (`index.ts`) and locally (`dev/server.ts`).
 * Without `host` it listens on every network, as the platform needs; the dev
 * server passes 127.0.0.1. Start background jobs of the app here.
 */
export function startServer(app: Express, host?: string): void {
  const onListening = () => {
    logger.info(
      { port: env.PORT, host: host ?? "all networks" },
      "Backend started",
    );
  };
  const server = host
    ? app.listen(env.PORT, host, onListening)
    : app.listen(env.PORT, onListening);

  // The platform sends SIGTERM on a deploy: finish running requests first.
  process.once("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down");
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
