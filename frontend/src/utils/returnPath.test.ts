import { describe, expect, it } from "vitest";

import { readReturnPath, rememberReturnPath, safePath } from "./returnPath";

describe("safePath", () => {
  it.each([
    ["/", "/"],
    ["/projects/12?tab=notes#top", "/projects/12?tab=notes#top"],
  ])("accepts %s", (path, expected) => {
    expect(safePath(path)).toBe(expected);
  });

  it.each([
    ["another site", "https://evil.example"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash URL", "/\\evil.example"],
    ["a relative path", "projects"],
    ["the sign-in page", "/login"],
    ["the sign-in page with a query", "/login?x=1"],
    ["no string", 42],
  ])("refuses %s", (_case, path) => {
    expect(safePath(path)).toBeNull();
  });
});

describe("rememberReturnPath", () => {
  it("keeps a path for this tab and clears it with null", () => {
    rememberReturnPath("/projects");
    expect(readReturnPath()).toBe("/projects");

    rememberReturnPath(null);
    expect(readReturnPath()).toBeNull();
  });

  it("never returns an unsafe stored value", () => {
    window.sessionStorage.setItem("returnPath", "//evil.example");

    expect(readReturnPath()).toBeNull();
  });
});
