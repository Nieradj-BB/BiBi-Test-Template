import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * The app's only Supabase client. The browser signs in at Supabase and keeps
 * the session; the backend gets the token with every request (`api.ts`). PKCE:
 * after Microsoft a code comes back, never a token in the URL.
 *
 * `null` while VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing:
 * the Supabase project does not exist yet. The sign-in page says so, and in
 * the dev server the dev login still works.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
