import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "../app";
import { prisma } from "../config/prisma";

vi.mock("../config/prisma", () => ({
  prisma: { user: { count: vi.fn() } },
}));

describe("GET /health/live", () => {
  it("always answers 200", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
  });
});

describe("GET /health/ready", () => {
  it("answers 200 when the database is reachable", async () => {
    vi.mocked(prisma.user.count).mockResolvedValueOnce(0);

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
  });

  it("answers 503 when the database is unreachable", async () => {
    vi.mocked(prisma.user.count).mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("NOT_READY");
  });
});
