/// <reference types="vite/client" />

interface ViteTypeOptions {
  // Only the variables below: a typo in a name is a type error.
  strictImportMetaEnv: unknown;
}

/** The frontend settings. Vite bakes them in at build time. */
interface ImportMetaEnv {
  /** Only needed when the backend does not run on the same origin under /api. */
  readonly VITE_API_URL?: string;
  /** The Supabase project. */
  readonly VITE_SUPABASE_URL?: string;
  /** The publishable key: public, meant for the browser. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /**
   * "true": the dev login. Counts only in the Vite dev server
   * (`import.meta.env.DEV` and a mode other than `production`), never in a build.
   */
  readonly VITE_DEV_LOGIN_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
