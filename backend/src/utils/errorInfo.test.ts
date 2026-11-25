import { describe, expect, it } from "vitest";

import { errorInfo } from "./errorInfo";

describe("errorInfo", () => {
  it("never includes the message", () => {
    const err = Object.assign(new Error("password=secret"), {
      code: "ECONNREFUSED",
      status: 503,
    });

    const info = errorInfo(err);

    expect(info).toMatchObject({
      name: "Error",
      code: "ECONNREFUSED",
      status: 503,
    });
    expect(JSON.stringify(info)).not.toContain("secret");
    expect(info.location?.[0]).toMatch(/^at /);
  });

  it("describes a non-error by its type", () => {
    expect(errorInfo("oops")).toEqual({ name: "string" });
  });
});
