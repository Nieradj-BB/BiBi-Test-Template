const KEY = "returnPath";

/**
 * A path inside this app, or `null`. Only a path that starts with one "/" is
 * accepted, so a crafted link cannot send the user to another site after
 * sign-in ("//evil.example" and "/\evil.example" are other sites to a
 * browser). The sign-in page itself is never a return path.
 */
export function safePath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\")
  ) {
    return null;
  }
  if (
    path === "/login" ||
    path.startsWith("/login?") ||
    path.startsWith("/login#")
  ) {
    return null;
  }
  return path;
}

/**
 * Remembers where to go after a sign-in that leaves the app (Microsoft), for
 * this tab only. Storage can be unavailable (private mode); then the user
 * lands on the start page.
 */
export function rememberReturnPath(path: string | null): void {
  try {
    if (path) window.sessionStorage.setItem(KEY, path);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // No storage: fall back to the start page.
  }
}

export function readReturnPath(): string | null {
  try {
    return safePath(window.sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}
