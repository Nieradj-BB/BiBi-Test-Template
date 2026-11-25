import { describe, expect, it } from "vitest";

import {
  checkLocation,
  isLocalDatabase,
  loadDevConfig,
  THIS_MACHINE_ONLY,
} from "./devConfig";

const SECRET = "a".repeat(32);
const LOCAL_DB = "postgresql://app:app@localhost:5432/app";

describe("loadDevConfig", () => {
  it("is off unless DEV_LOGIN_ENABLED is exactly 'true'", () => {
    expect(loadDevConfig({ DEV_LOGIN_ENABLED: "1" })).toEqual({
      enabled: false,
    });
    expect(loadDevConfig({})).toEqual({ enabled: false });
  });

  it("returns the secret when on", () => {
    expect(
      loadDevConfig({ DEV_LOGIN_ENABLED: "true", DEV_LOGIN_SECRET: SECRET }),
    ).toEqual({ enabled: true, secret: SECRET });
  });

  it("requires a secret of at least 32 characters", () => {
    expect(() => loadDevConfig({ DEV_LOGIN_ENABLED: "true" })).toThrow(
      "DEV_LOGIN_SECRET is required",
    );
    expect(() =>
      loadDevConfig({ DEV_LOGIN_ENABLED: "true", DEV_LOGIN_SECRET: "short" }),
    ).toThrow("at least 32 characters");
  });

  it("refuses to run with NODE_ENV=production, even when off", () => {
    expect(() => loadDevConfig({ NODE_ENV: "production" })).toThrow(
      "NODE_ENV=production",
    );
  });
});

describe("isLocalDatabase", () => {
  it.each([
    [LOCAL_DB, true],
    ["postgres://app:app@127.0.0.1:5432/app", true],
    ["postgresql://app:app@[::1]:5432/app", true],
    ["postgresql://app:app@db.example.com:25060/app", false],
    ["postgresql://app:app@localhost/app?host=db.example.com", false],
    ["socket://localhost/app", false],
    ["not a url", false],
    [undefined, false],
  ])("%s → %s", (url, expected) => {
    expect(isLocalDatabase(url)).toBe(expected);
  });
});

describe("checkLocation", () => {
  it("listens on this machine only, and on a laptop only for localhost", () => {
    expect(checkLocation({ DATABASE_URL: LOCAL_DB })).toEqual({
      host: THIS_MACHINE_ONLY,
      ownHostOnly: true,
    });
  });

  it("accepts the forwarded Host in a Codespace", () => {
    expect(
      checkLocation({ DATABASE_URL: LOCAL_DB, CODESPACES: "true" }).ownHostOnly,
    ).toBe(false);
  });

  it("refuses a managed database", () => {
    expect(() =>
      checkLocation({ DATABASE_URL: LOCAL_DB, DATABASE_CA_CERT: "pem" }),
    ).toThrow("managed database");
  });

  it("refuses a remote database without showing its URL", () => {
    const url = "postgresql://app:supersecret@db.example.com/app";

    expect(() => checkLocation({ DATABASE_URL: url })).toThrow(
      "only runs against a local database",
    );
    expect(() => checkLocation({ DATABASE_URL: url })).not.toThrow(
      "supersecret",
    );
  });
});
