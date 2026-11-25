import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuth } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/errorHandler";
import { SESSION_COOKIE } from "./devSession";
import { TEST_ACCOUNTS, withDevLogin } from "./devLogin";

const db = vi.hoisted(() => ({
  user: { upsert: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("../src/config/prisma", () => ({ prisma: db }));
vi.mock("../src/config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const ADMIN = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  authId: null,
  email: TEST_ACCOUNTS.admin.email,
  name: TEST_ACCOUNTS.admin.name,
  roles: [...TEST_ACCOUNTS.admin.roles],
  active: true,
};

function makeApp(ownHostOnly = false): express.Express {
  const app = express();
  app.get("/api/who", requireAuth, (req, res) => {
    res.json({ data: req.user });
  });
  app.use(errorHandler);
  return withDevLogin(app, { ownHostOnly });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/auth/dev-login", () => {
  it("signs in as the test account of the role and sets a session cookie", async () => {
    db.user.upsert.mockResolvedValueOnce(ADMIN);
    db.user.findFirst.mockResolvedValueOnce(ADMIN);
    const agent = request.agent(makeApp());

    const login = await agent
      .post("/api/auth/dev-login")
      .send({ role: "admin" });
    const who = await agent.get("/api/who");

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]?.[0]).toContain(`${SESSION_COOKIE}=`);
    expect(login.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: TEST_ACCOUNTS.admin.email },
        update: { roles: ["user", "admin"] },
      }),
    );
    expect(who.status).toBe(200);
    expect(who.body.data.roles).toEqual(["user", "admin"]);
  });

  it("refuses an unknown role", async () => {
    const response = await request(makeApp())
      .post("/api/auth/dev-login")
      .send({ role: "root" });

    expect(response.status).toBe(400);
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("refuses a foreign Host when ownHostOnly is on", async () => {
    const response = await request(makeApp(true))
      .post("/api/auth/dev-login")
      .set("Host", "evil.example.com")
      .send({ role: "admin" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNKNOWN_HOST");
  });
});

describe("POST /api/auth/dev-logout", () => {
  it("clears the session cookie", async () => {
    const response = await request(makeApp()).post("/api/auth/dev-logout");

    expect(response.status).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      `${SESSION_COOKIE}=;`,
    );
  });
});
