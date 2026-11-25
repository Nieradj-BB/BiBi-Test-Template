import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      VITE_API_URL: "http://localhost:3001/api",
      VITE_DEV_LOGIN_ENABLED: "true",
      // Fake values: tests never talk to a real Supabase project.
      VITE_SUPABASE_URL: "https://test-ref.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
  },
});
