import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
  SignJWT,
} from "jose";

/**
 * Tokens as Supabase issues them, signed with a test ES256 key (the project has
 * an ECC P-256 key). In a test:
 *
 *   vi.mock("…/services/auth/supabaseKeys", () => ({ supabaseKeys: () => testKeys }));
 */

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

/** The SUPABASE_URL from vitest.config.mts, with the Supabase Auth path. */
export const TEST_ISSUER = "https://test-ref.supabase.co/auth/v1";
export const TEST_AUTH_ID = "6b1f5a0e-3c2d-4e8f-9a7b-1c2d3e4f5a6b";

let pair: Promise<KeyPair> | null = null;
let jwks: Promise<JWTVerifyGetKey> | null = null;

function key(): Promise<KeyPair> {
  pair ??= generateKeyPair("ES256", { extractable: true });
  return pair;
}

function keySet(): Promise<JWTVerifyGetKey> {
  jwks ??= key().then(async ({ publicKey }) =>
    createLocalJWKSet({
      keys: [{ ...(await exportJWK(publicKey)), kid: "test", alg: "ES256" }],
    }),
  );
  return jwks;
}

/** The test project's public keys, as `supabaseKeys()` returns them. */
export const testKeys: JWTVerifyGetKey = async (header, token) =>
  (await keySet())(header, token);

export interface TokenOptions {
  sub?: string;
  issuer?: string;
  audience?: string;
  /** Seconds since 1970, or a duration like "1h"; default in one hour. */
  expires?: number | string;
  withoutExp?: boolean;
  /** Sign with another key under the same kid: a forged token. */
  foreignKey?: boolean;
}

/** A Supabase access token; `claims` overrides email and provider. */
export async function supabaseToken(
  claims: Record<string, unknown> = {},
  options: TokenOptions = {},
): Promise<string> {
  const { privateKey } = options.foreignKey
    ? await generateKeyPair("ES256")
    : await key();
  let token = new SignJWT({
    email: "anna@example.com",
    app_metadata: { provider: "email" },
    role: "authenticated",
    ...claims,
  })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setSubject(options.sub ?? TEST_AUTH_ID)
    .setIssuer(options.issuer ?? TEST_ISSUER)
    .setAudience(options.audience ?? "authenticated")
    .setIssuedAt();
  if (!options.withoutExp) {
    token = token.setExpirationTime(options.expires ?? "1h");
  }
  return token.sign(privateKey);
}

/** The `amr` claim of a Microsoft (OAuth) sign-in `secondsAgo` seconds ago. */
export function oauthAmr(
  secondsAgo = 5,
): { method: string; timestamp: number }[] {
  return [
    { method: "oauth", timestamp: Math.floor(Date.now() / 1000) - secondsAgo },
  ];
}
