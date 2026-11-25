import type { Express } from "express";
import request from "supertest";

import {
  localSession,
  SESSION_COOKIE,
  signDevSession,
} from "../../dev/devSession";

/** The Cookie header of the dev login for this user id. */
export async function sessionCookie(id: string): Promise<string> {
  return `${SESSION_COOKIE}=${await signDevSession(id)}`;
}

/**
 * An agent signed in as this user id, with the dev login cookie. Sets the hook
 * on `app`, as `dev/server.ts` does. Use it in route tests:
 *
 *   const agent = await signedInAs(app, USER.id);
 *   await agent.get("/api/…");
 */
export async function signedInAs(
  app: Express,
  id: string,
): Promise<ReturnType<typeof request.agent>> {
  app.locals.localSession = localSession;
  return request.agent(app).set("Cookie", await sessionCookie(id));
}
