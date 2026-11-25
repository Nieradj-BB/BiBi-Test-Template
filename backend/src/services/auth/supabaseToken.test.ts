import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "../../config/logger";
import {
  oauthAmr,
  supabaseToken,
  TEST_AUTH_ID,
  testKeys,
} from "../../test/supabaseTokens";
import { supabaseKeys } from "./supabaseKeys";
import { verifySupabaseToken } from "./supabaseToken";

vi.mock("./supabaseKeys", () => ({ supabaseKeys: vi.fn() }));
vi.mock("../../config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabaseKeys).mockReturnValue(testKeys);
});

const MICROSOFT = { app_metadata: { provider: "azure", providers: ["azure"] } };

describe("verifySupabaseToken", () => {
  it("returns the identity of a valid token", async () => {
    const identity = await verifySupabaseToken(await supabaseToken());

    expect(identity).toEqual({
      authId: TEST_AUTH_ID,
      email: "anna@example.com",
      provider: "email",
      viaMicrosoft: false,
      nameAfterSignIn: null,
      freshSignIn: false,
    });
  });

  it("recognises a fresh Microsoft sign-in and takes over the name", async () => {
    const token = await supabaseToken({
      ...MICROSOFT,
      amr: oauthAmr(5),
      user_metadata: { full_name: " Anna de Vries " },
    });

    const identity = await verifySupabaseToken(token);

    expect(identity).toMatchObject({
      viaMicrosoft: true,
      freshSignIn: true,
      nameAfterSignIn: "Anna de Vries",
    });
  });

  it("ignores the name once the sign-in is no longer fresh", async () => {
    const token = await supabaseToken({
      ...MICROSOFT,
      amr: oauthAmr(600),
      user_metadata: { full_name: "Zelf Gekozen" },
    });

    const identity = await verifySupabaseToken(token);

    expect(identity).toMatchObject({
      viaMicrosoft: true,
      freshSignIn: false,
      nameAfterSignIn: null,
    });
  });

  it("is not via Microsoft when another provider is linked too", async () => {
    const token = await supabaseToken({
      app_metadata: { provider: "azure", providers: ["azure", "email"] },
      amr: oauthAmr(),
    });

    expect((await verifySupabaseToken(token)).viaMicrosoft).toBe(false);
  });

  it.each([
    ["expired", { expires: Math.floor(Date.now() / 1000) - 60 }],
    ["without exp", { withoutExp: true }],
    ["from another issuer", { issuer: "https://other.supabase.co/auth/v1" }],
    ["for another audience", { audience: "anon" }],
    ["signed with a foreign key", { foreignKey: true }],
  ])("refuses a token %s with 401", async (_case, options) => {
    const token = await supabaseToken({}, options);

    await expect(verifySupabaseToken(token)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("refuses an anonymous user", async () => {
    const token = await supabaseToken({ is_anonymous: true });

    await expect(verifySupabaseToken(token)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("answers 500 AUTH_UNAVAILABLE when the keys cannot be fetched", async () => {
    vi.mocked(supabaseKeys).mockReturnValue(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      verifySupabaseToken(await supabaseToken()),
    ).rejects.toMatchObject({ status: 500, code: "AUTH_UNAVAILABLE" });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("never logs the token", async () => {
    const token = await supabaseToken({}, { foreignKey: true });

    await expect(verifySupabaseToken(token)).rejects.toThrow();

    const logged = JSON.stringify(vi.mocked(logger.warn).mock.calls);
    expect(logged).not.toContain(token);
  });
});
