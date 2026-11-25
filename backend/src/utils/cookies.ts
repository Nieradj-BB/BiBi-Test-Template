/** One cookie from the Cookie header. Enough for short values; no cookie parser needed. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.split("=");
    if (key?.trim() === name) return value.join("=").trim();
  }
  return undefined;
}
