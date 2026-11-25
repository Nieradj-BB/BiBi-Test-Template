import type { PoolConfig } from "pg";

/**
 * Pool settings for node-postgres, separate from `env` so they can be tested.
 *
 * A managed Postgres (such as DigitalOcean) presents a certificate from its own
 * CA, which is not in Node's trust store. node-postgres lets `sslmode` in the
 * connection string win over an explicit ssl config, so with a CA we remove
 * `sslmode` from the URL and verify the full chain against that CA. Without a
 * CA (local, test) only the connection string is used.
 */
export function poolConfig(databaseUrl: string, caCert?: string): PoolConfig {
  const base: PoolConfig = {
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  };
  if (!caCert) {
    return { ...base, connectionString: databaseUrl };
  }
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return {
    ...base,
    connectionString: url.toString(),
    ssl: { ca: caCert, rejectUnauthorized: true },
  };
}
