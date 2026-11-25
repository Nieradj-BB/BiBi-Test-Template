import { isAxiosError } from "axios";

/** The `error` object from the backend's answer, or `null` without one. */
function backendError(err: unknown): object | null {
  if (!isAxiosError<unknown>(err)) return null;
  const body = err.response?.data;
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }
  const { error } = body;
  return typeof error === "object" && error !== null ? error : null;
}

/**
 * The message for the user after a failed request. The backend sends errors as
 * `{ error: { code, message } }`, with a Dutch message that may be shown.
 * Without one (no connection, a proxy returning HTML, a bug) the fallback
 * follows.
 */
export function errorMessage(
  err: unknown,
  fallback = "Er ging iets mis. Probeer het opnieuw.",
): string {
  const error = backendError(err);
  if (!error || !("message" in error)) return fallback;
  const { message } = error;
  return typeof message === "string" && message.trim() !== ""
    ? message
    : fallback;
}

/** The backend's code after a failed request, such as "NOT_FOUND"; `null` without one. */
export function errorCode(err: unknown): string | null {
  const error = backendError(err);
  if (!error || !("code" in error)) return null;
  const { code } = error;
  return typeof code === "string" ? code : null;
}
