import { Router } from "express";

import { prisma } from "../config/prisma";

export const healthRouter = Router();

/** The process runs. */
healthRouter.get("/live", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

/** The process can serve requests: the database answers. */
healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.user.count();
    res.json({ data: { status: "ok" } });
  } catch {
    res.status(503).json({
      error: { code: "NOT_READY", message: "Database niet bereikbaar" },
    });
  }
});
