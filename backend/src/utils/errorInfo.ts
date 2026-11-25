export interface ErrorInfo {
  name: string;
  code?: string;
  status?: number;
  /** The top of the stack trace: where it went wrong. */
  location?: string[];
}

/**
 * What can safely be logged about an error: its name, code, status and
 * location. Never the message, which can contain user input, a connection
 * string or a token.
 */
export function errorInfo(err: unknown): ErrorInfo {
  if (!(err instanceof Error)) return { name: typeof err };
  const code =
    "code" in err && typeof err.code === "string" ? err.code : undefined;
  const status =
    "status" in err && Number.isInteger(err.status)
      ? Number(err.status)
      : undefined;
  const location = err.stack
    ?.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .slice(0, 5);
  return {
    name: err.name,
    ...(code ? { code } : {}),
    ...(status === undefined ? {} : { status }),
    ...(location?.length ? { location } : {}),
  };
}
