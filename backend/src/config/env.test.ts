import { describe, expect, it, vi } from "vitest";

import { booleanEnv, loadEnv } from "./env";

const VALID = {
  DATABASE_URL: "postgresql://app:app@localhost:5432/app",
  CORS_ORIGIN: "http://localhost:5173",
};

describe("loadEnv", () => {
  it("fills defaults", () => {
    const env = loadEnv(VALID);

    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      LOG_LEVEL: "info",
    });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.DATABASE_CA_CERT).toBeUndefined();
  });

  it("treats an empty SUPABASE_URL and DATABASE_CA_CERT as absent", () => {
    const env = loadEnv({ ...VALID, SUPABASE_URL: "", DATABASE_CA_CERT: " " });

    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.DATABASE_CA_CERT).toBeUndefined();
  });

  it("refuses a SUPABASE_URL without https", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      loadEnv({ ...VALID, SUPABASE_URL: "http://test-ref.supabase.co" }),
    ).toThrow("Environment validatie mislukt");
  });

  it("refuses production without SUPABASE_URL", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => loadEnv({ ...VALID, NODE_ENV: "production" })).toThrow(
      "Environment validatie mislukt",
    );
    expect(error).toHaveBeenCalledWith("Ongeldige environment configuratie:", {
      SUPABASE_URL: ["SUPABASE_URL is verplicht in productie"],
    });
  });

  it("accepts production with SUPABASE_URL", () => {
    const env = loadEnv({
      ...VALID,
      NODE_ENV: "production",
      SUPABASE_URL: "https://test-ref.supabase.co",
    });

    expect(env.SUPABASE_URL).toBe("https://test-ref.supabase.co");
  });

  it("refuses a missing DATABASE_URL", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => loadEnv({ CORS_ORIGIN: VALID.CORS_ORIGIN })).toThrow(
      "Environment validatie mislukt",
    );
  });
});

describe("booleanEnv", () => {
  it.each([
    ["true", true],
    ["false", false],
    ["1", false],
    ["", true],
    [undefined, true],
  ])("reads %j with default true as %s", (value, expected) => {
    expect(booleanEnv(true).parse(value)).toBe(expected);
  });
});
