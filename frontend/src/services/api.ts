import axios, { isAxiosError } from "axios";

import { supabase } from "@/services/supabase";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Already retried with a refreshed token: not again. */
    afterRefresh?: boolean;
  }
}

// Relative by default: locally the Vite proxy forwards /api, in production
// frontend and backend share one origin. An absolute localhost URL breaks in a
// Codespace, where the browser does not run in the container.
const baseURL = import.meta.env.VITE_API_URL || "/api";

/**
 * The client for the backend. No `withCredentials`: the dev server's session
 * cookie travels through the Vite proxy to the same origin, so cookies never
 * go to another origin.
 */
export const api = axios.create({ baseURL });

async function supabaseToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/** The Supabase token goes with every request; `getSession` refreshes a nearly expired one first. */
api.interceptors.request.use(async (config) => {
  const token = await supabaseToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

/**
 * A 401 while there is a Supabase session: the token may just have expired,
 * for example after sleep mode. Refresh once and retry. If refreshing fails,
 * it stays a 401 and the sign-in page follows.
 */
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (
    !supabase ||
    !isAxiosError(error) ||
    error.response?.status !== 401 ||
    !error.config ||
    error.config.afterRefresh
  ) {
    throw error;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw error;
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session) throw error;
  return api.request({ ...error.config, afterRefresh: true });
});
