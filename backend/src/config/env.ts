import { z } from "zod";

// Node does not load .env by itself. This fills process.env without
// overwriting existing values (CI, the platform). Tests never read it: they
// get fixed values from vitest.config.mts.
if (!process.env.VITEST) {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: values come from the environment.
  }
}

/** An optional string where an empty value counts as absent. */
function optionalString() {
  return z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value : undefined));
}

/**
 * Only the literal text "true" is true. `z.coerce.boolean()` would turn the
 * string "false" into `true`.
 */
export function booleanEnv(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value === "" ? defaultValue : value === "true",
    );
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is verplicht"),
    /// CA certificate (PEM) of a managed Postgres. Absent locally (no TLS).
    DATABASE_CA_CERT: optionalString(),
    CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is verplicht"),
    /// The header in which the platform puts the client's IP address, for the
    /// rate limiter. DigitalOcean App Platform: do-connecting-ip. Empty: the
    /// address from the connection (X-Forwarded-For, one trusted hop).
    CLIENT_IP_HEADER: optionalString(),

    /// The Supabase project. Empty: Supabase sign-in is off and every Supabase
    /// token is refused; only the dev login works. Required in production.
    SUPABASE_URL: optionalString().pipe(
      z
        .string()
        .url("SUPABASE_URL moet een URL zijn")
        .startsWith("https://", "SUPABASE_URL moet met https:// beginnen")
        .optional(),
    ),
  })
  .superRefine((env, ctx) => {
    // In production nobody could sign in: stop at the deploy, not at the first user.
    if (env.NODE_ENV === "production" && !env.SUPABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["SUPABASE_URL"],
        message: "SUPABASE_URL is verplicht in productie",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error(
      "Ongeldige environment configuratie:",
      z.flattenError(parsed.error).fieldErrors,
    );
    throw new Error("Environment validatie mislukt");
  }
  return parsed.data;
}

export const env = loadEnv();
