import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../app";
import { signedInAs } from "../test/session";

const db = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
vi.mock("../config/prisma", () => ({ prisma: db }));

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

describe("GET /api/auth/me", () => {
  it("returns who is signed in", async () => {
    db.user.findFirst.mockResolvedValue(USER);
    const agent = await signedInAs(app, USER.id);

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: USER.id,
        email: USER.email,
        name: USER.name,
        roles: USER.roles,
      },
    });
  });

  it("answers 401 when nobody is signed in", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });
});
