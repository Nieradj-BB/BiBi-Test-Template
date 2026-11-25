import { z } from "zod";

/**
 * The dev login: sign in with one click, without a password, as a test user or
 * a test admin. It exists only in the local development server
 * (`dev/server.ts`). This folder never ends up in the build, and with
 * NODE_ENV=production it refuses to start.
 */
export type DevConfig = { enabled: false } | { enabled: true; secret: string };

const devConfigSchema = z.object({
  // Only the literal text "true" counts, not "false" or "1".
  DEV_LOGIN_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  // Signs the session (HS256). Empty counts as absent.
  DEV_LOGIN_SECRET: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const MIN_SECRET_LENGTH = 32;

export function loadDevConfig(
  source: NodeJS.ProcessEnv = process.env,
): DevConfig {
  if (source.NODE_ENV === "production") {
    throw new Error(
      "The local development server and the dev login never run with NODE_ENV=production",
    );
  }
  const { DEV_LOGIN_ENABLED, DEV_LOGIN_SECRET } = devConfigSchema.parse(source);
  if (!DEV_LOGIN_ENABLED) return { enabled: false };
  if (!DEV_LOGIN_SECRET) {
    throw new Error("DEV_LOGIN_SECRET is required when DEV_LOGIN_ENABLED=true");
  }
  if (DEV_LOGIN_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `DEV_LOGIN_SECRET must have at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return { enabled: true, secret: DEV_LOGIN_SECRET };
}

/** Only this machine: nobody else on the network reaches the server. */
export const THIS_MACHINE_ONLY = "127.0.0.1";

/** The names this machine uses for itself, as `new URL` and `?host=` give them. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** With another scheme node-postgres falls back to PGHOST, which can point anywhere. */
const POSTGRES_SCHEMES = new Set(["postgres:", "postgresql:"]);

/**
 * Whether DATABASE_URL points to a database on this machine. node-postgres
 * prefers a `host` in the query over the URL's host, so that must be local
 * too. The error of `new URL` is never rethrown: it contains the whole URL,
 * password included.
 */
export function isLocalDatabase(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return false;
  }
  if (!POSTGRES_SCHEMES.has(url.protocol)) return false;
  return [url.hostname, ...url.searchParams.getAll("host")].every((host) =>
    LOCAL_HOSTS.has(host.toLowerCase()),
  );
}

export type Location = {
  host: typeof THIS_MACHINE_ONLY;
  /** Only requests with the Host localhost; see `withDevLogin`. */
  ownHostOnly: boolean;
};

/**
 * Where the dev login may run, and how the server listens. Only against a
 * database on this machine and never against a managed database (which needs
 * DATABASE_CA_CERT): the button creates an admin in the database it points to.
 *
 * The server always listens on 127.0.0.1 only, also in a Codespace; otherwise
 * anyone on the same network becomes admin with one click. Outside a Codespace
 * it also accepts only the Host localhost; inside one it cannot, because the
 * Vite proxy passes on the Host of the forwarded URL.
 */
export function checkLocation(
  source: NodeJS.ProcessEnv = process.env,
): Location {
  if (source.DATABASE_CA_CERT?.trim()) {
    throw new Error(
      "The dev login never runs against a managed database (DATABASE_CA_CERT is set). Set DEV_LOGIN_ENABLED=false.",
    );
  }
  // Never the URL itself in the message: it contains the password.
  if (!isLocalDatabase(source.DATABASE_URL)) {
    throw new Error(
      "The dev login only runs against a local database: DATABASE_URL is missing, unreadable or does not point to localhost, 127.0.0.1 or ::1. Start the local database (docker compose up -d --wait db) or set DEV_LOGIN_ENABLED=false.",
    );
  }
  return {
    host: THIS_MACHINE_ONLY,
    ownHostOnly: source.CODESPACES !== "true",
  };
}
