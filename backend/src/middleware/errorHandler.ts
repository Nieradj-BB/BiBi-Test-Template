import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { errorInfo } from "../utils/errorInfo";

/** An expected error with a status, a SCREAMING_SNAKE code and a user-facing message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Every error leaves the API as `{ error: { code, message } }`. Unexpected
 * errors are logged without their message and answered with a generic 500.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Ongeldige invoer" },
    });
    return;
  }
  // Errors from express.json(): malformed JSON (400) or a body that is too large (413).
  if (isBodyError(err)) {
    res.status(err.status).json({
      error:
        err.status === 413
          ? { code: "PAYLOAD_TOO_LARGE", message: "Het verzoek is te groot" }
          : { code: "VALIDATION_ERROR", message: "Ongeldige invoer" },
    });
    return;
  }

  logger.error({ error: errorInfo(err), path: req.path }, "Unexpected error");
  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Er is iets misgegaan" },
  });
}

function isBodyError(err: unknown): err is { status: number; type: string } {
  if (typeof err !== "object" || err === null) return false;
  const { status, type } = err as { status?: unknown; type?: unknown };
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof type === "string"
  );
}
