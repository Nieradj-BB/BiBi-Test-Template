import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { localSession } from "../../dev/devSession";
import { supabaseKeys } from "../services/auth/supabaseKeys";
import { sessionCookie } from "../test/session";
import {
  oauthAmr,
  supabaseToken,
  TEST_AUTH_ID,
  testKeys,
} from "../test/supabaseTokens";
import { requireAuth, requireRole } from "./auth";
import { errorHandler } from "./errorHandler";

const db = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("../config/prisma", () => ({ prisma: db }));
vi.mock("../config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../services/auth/supabaseKeys", () => ({ supabaseKeys: vi.fn() }));

/** Only the middleware and the error format, without the rest of the app. */
function makeApp(): express.Express {
  const app = express();
  app.get("/who", requireAuth, (req, res) => {
    res.json({ data: req.user });
  });
  app.get("/admin", requireAuth, requireRole("admin"), (_req, res) => {
    res.json({ data: { ok: true } });
  });
  app.use(errorHandler);
  return app;
}

/** As in the dev server: with the dev login hook. */
const app = makeApp();
app.locals.localSession = localSession;
/** As in production: without the hook. */
const withoutHook = makeApp();

const ADMIN = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  authId: null,
  email: "admin@bb-template.test",
  name: "Test Beheerder",
  roles: ["user", "admin"],
  active: true,
};
const ANNA = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  authId: TEST_AUTH_ID,
  email: "anna@example.com",
  name: "Anna de Vries",
  roles: ["user"],
  active: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supabaseKeys).mockReturnValue(testKeys);
});

describe("requireAuth", () => {
  it("answers 401 without a header or cookie", async () => {
    const response = await request(app).get("/who");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("accepts a valid Supabase token of a known user", async () => {
    db.user.findUnique.mockResolvedValueOnce(ANNA);
    const token = await supabaseToken({
      app_metadata: { provider: "azure" },
      amr: oauthAmr(600),
    });

    const response = await request(app)
      .get("/who")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: ANNA.id,
      email: ANNA.email,
      name: ANNA.name,
      roles: ANNA.roles,
    });
  });

  it("refuses a malformed Authorization header", async () => {
    const response = await request(app)
      .get("/who")
      .set("Authorization", "Basic abc");

    expect(response.status).toBe(401);
  });

  it("accepts the dev login cookie in the dev server", async () => {
    db.user.findFirst.mockResolvedValueOnce(ADMIN);

    const response = await request(app)
      .get("/who")
      .set("Cookie", await sessionCookie(ADMIN.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(ADMIN.id);
  });

  it("ignores the dev login cookie without the hook (production)", async () => {
    const response = await request(withoutHook)
      .get("/who")
      .set("Cookie", await sessionCookie(ADMIN.id));

    expect(response.status).toBe(401);
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("refuses a deactivated account with 403", async () => {
    db.user.findFirst.mockResolvedValueOnce({ ...ADMIN, active: false });

    const response = await request(app)
      .get("/who")
      .set("Cookie", await sessionCookie(ADMIN.id));

    expect(response.status).toBe(403);
  });

  it("passes a database error on as a 500, not a sign-out", async () => {
    db.user.findFirst.mockRejectedValueOnce(new Error("connection refused"));

    const response = await request(app)
      .get("/who")
      .set("Cookie", await sessionCookie(ADMIN.id));

    expect(response.status).toBe(500);
  });
});

describe("requireRole", () => {
  it("lets a user with the role through", async () => {
    db.user.findFirst.mockResolvedValueOnce(ADMIN);

    const response = await request(app)
      .get("/admin")
      .set("Cookie", await sessionCookie(ADMIN.id));

    expect(response.status).toBe(200);
  });

  it("refuses a user without the role with 403", async () => {
    db.user.findFirst.mockResolvedValueOnce({ ...ANNA, authId: null });

    const response = await request(app)
      .get("/admin")
      .set("Cookie", await sessionCookie(ANNA.id));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
