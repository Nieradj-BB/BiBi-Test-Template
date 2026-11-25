import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "./app";
import { signedInAs } from "./test/session";

const db = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
vi.mock("./config/prisma", () => ({ prisma: db }));

const USER = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  authId: null,
  email: "user@bb-template.test",
  name: "Test Gebruiker",
  roles: ["user"],
  active: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("the API gate", () => {
  it("answers 401 without a sign-in, also for a route that does not exist", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("lets a signed-in user through to the 404 in the standard error shape", async () => {
    db.user.findFirst.mockResolvedValue(USER);
    const agent = await signedInAs(app, USER.id);

    const response = await agent.get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Deze route bestaat niet" },
    });
  });

  it("answers 404 for an unknown /api/auth route, such as the dev login in a build", async () => {
    const response = await request(app).post("/api/auth/dev-login");

    expect(response.status).toBe(404);
  });

  it("keeps /health open", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
  });
});
