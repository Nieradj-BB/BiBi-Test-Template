import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

const keySets = new Map<string, JWTVerifyGetKey>();

/**
 * The public keys (JWKS) of the Supabase project. jose caches them and only
 * fetches again for an unknown key, so a key rotation in Supabase just works.
 * Tests replace this module with their own key (`src/test/supabaseTokens.ts`).
 */
export function supabaseKeys(supabaseUrl: string): JWTVerifyGetKey {
  let keys = keySets.get(supabaseUrl);
  if (!keys) {
    keys = createRemoteJWKSet(
      new URL("/auth/v1/.well-known/jwks.json", supabaseUrl),
    );
    keySets.set(supabaseUrl, keys);
  }
  return keys;
}
