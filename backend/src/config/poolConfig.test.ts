import { describe, expect, it } from "vitest";

import { poolConfig } from "./poolConfig";

const URL_WITH_SSLMODE =
  "postgresql://user:secret@db.example.com:25060/app?sslmode=require";

describe("poolConfig", () => {
  it("uses only the connection string without a CA", () => {
    const config = poolConfig(URL_WITH_SSLMODE);

    expect(config.connectionString).toBe(URL_WITH_SSLMODE);
    expect(config.ssl).toBeUndefined();
  });

  it("verifies against the CA and drops sslmode when a CA is given", () => {
    const config = poolConfig(URL_WITH_SSLMODE, "-----BEGIN CERTIFICATE-----");

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----",
      rejectUnauthorized: true,
    });
  });

  it("limits the pool and its timeouts", () => {
    expect(poolConfig(URL_WITH_SSLMODE)).toMatchObject({
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  });
});
