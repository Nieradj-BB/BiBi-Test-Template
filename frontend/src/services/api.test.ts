import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSession, supabaseFake } from "@/test/supabaseFake";

import { api } from "./api";

vi.mock("@/services/supabase", async () => ({
  supabase: (await import("@/test/supabaseFake")).supabaseFake.supabase,
}));

const adapter = vi.fn<AxiosAdapter>();

function respond(config: InternalAxiosRequestConfig, status: number) {
  const response = { status, statusText: "", headers: {}, config, data: {} };
  if (status >= 400) {
    return Promise.reject(
      new AxiosError("fail", "ERR_BAD_REQUEST", config, null, response),
    );
  }
  return Promise.resolve(response);
}

beforeEach(() => {
  supabaseFake.reset();
  adapter.mockReset();
  api.defaults.adapter = adapter;
});

describe("api", () => {
  it("sends the Supabase token as a Bearer header", async () => {
    supabaseFake.setSession(fakeSession(undefined, "token-1"));
    adapter.mockImplementation((config) => respond(config, 200));

    await api.get("/auth/me");

    const sent = adapter.mock.calls[0]?.[0];
    expect(sent?.headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("sends no header without a session", async () => {
    adapter.mockImplementation((config) => respond(config, 200));

    await api.get("/auth/me");

    expect(adapter.mock.calls[0]?.[0].headers.has("Authorization")).toBe(false);
  });

  it("refreshes once and retries after a 401", async () => {
    supabaseFake.setSession(fakeSession());
    adapter
      .mockImplementationOnce((config) => respond(config, 401))
      .mockImplementationOnce((config) => respond(config, 200));

    const response = await api.get("/auth/me");

    expect(response.status).toBe(200);
    expect(supabaseFake.supabase.auth.refreshSession).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("does not retry a second 401", async () => {
    supabaseFake.setSession(fakeSession());
    adapter.mockImplementation((config) => respond(config, 401));

    await expect(api.get("/auth/me")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("does not refresh without a session", async () => {
    adapter.mockImplementation((config) => respond(config, 401));

    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(AxiosError);
    expect(supabaseFake.supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
});
