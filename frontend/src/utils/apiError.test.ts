import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { errorCode, errorMessage } from "./apiError";

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  });
}

describe("errorMessage", () => {
  it("shows the backend's message", () => {
    const err = axiosError(403, {
      error: { code: "FORBIDDEN", message: "Je hebt hier geen toegang toe" },
    });

    expect(errorMessage(err)).toBe("Je hebt hier geen toegang toe");
    expect(errorCode(err)).toBe("FORBIDDEN");
  });

  it("falls back without a backend message", () => {
    expect(errorMessage(axiosError(502, "<html>"), "Probeer het later")).toBe(
      "Probeer het later",
    );
    expect(errorMessage(new Error("network"))).toBe(
      "Er ging iets mis. Probeer het opnieuw.",
    );
    expect(errorCode(new Error("network"))).toBeNull();
  });

  it("ignores an empty message", () => {
    const err = axiosError(400, { error: { code: "X", message: " " } });

    expect(errorMessage(err, "Standaard")).toBe("Standaard");
  });
});
