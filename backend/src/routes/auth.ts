import { Router } from "express";

import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

/** Who is signed in. The frontend calls this after every sign-in. */
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ data: req.user });
});
