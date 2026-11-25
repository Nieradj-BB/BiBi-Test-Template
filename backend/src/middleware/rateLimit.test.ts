import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { clientIp, defaultRateLimit } from "./rateLimit";

vi.mock("../config/env", () => ({
  env: { CLIENT_IP_HEADER: "do-connecting-ip" },
}));

// As in app.ts: one trusted proxy hop.
function makeApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(defaultRateLimit);
  app.get("/ip", (req, res) => {
    res.json({ ip: clientIp(req, "do-connecting-ip") });
  });
  return app;
}

describe("clientIp", () => {
  it("takes the client's address from the platform's header", async () => {
    const response = await request(makeApp())
      .get("/ip")
      .set("do-connecting-ip", "203.0.113.10");

    expect(response.body.ip).toBe("203.0.113.10");
  });

  it("falls back to the connection when the header is not an IP address", async () => {
    const response = await request(makeApp())
      .get("/ip")
      .set("do-connecting-ip", "203.0.113.10, 198.51.100.1");

    expect(response.body.ip).toMatch(/127\.0\.0\.1|::1/);
  });

  it("ignores the header when none is configured", async () => {
    const app = express();
    app.get("/ip", (req, res) => {
      res.json({ ip: clientIp(req, undefined) });
    });

    const response = await request(app)
      .get("/ip")
      .set("do-connecting-ip", "203.0.113.10");

    expect(response.body.ip).toMatch(/127\.0\.0\.1|::1/);
  });
});

describe("defaultRateLimit", () => {
  it("counts every client address on its own, behind one shared proxy", async () => {
    const app = makeApp();
    const as = (ip: string) =>
      request(app).get("/ip").set("do-connecting-ip", ip);

    await as("203.0.113.20");
    const second = await as("203.0.113.20");
    const other = await as("203.0.113.21");

    expect(second.headers["ratelimit-remaining"]).toBe("298");
    expect(other.headers["ratelimit-remaining"]).toBe("299");
  });
});
