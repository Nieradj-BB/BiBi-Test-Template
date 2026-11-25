import { describe, expect, it } from "vitest";

import { readCookie } from "./cookies";

describe("readCookie", () => {
  it("finds one cookie among several, keeping '=' in the value", () => {
    expect(readCookie("a=1; session=x.y=z; b=2", "session")).toBe("x.y=z");
  });

  it("returns undefined without a header or a match", () => {
    expect(readCookie(undefined, "session")).toBeUndefined();
    expect(readCookie("a=1", "session")).toBeUndefined();
  });
});
