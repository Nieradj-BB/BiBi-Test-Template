import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Never look in dist/: compiled CommonJS tests would break the run.
    include: ["src/**/*.test.ts", "dev/**/*.test.ts"],
    // Fixed values: tests never read backend/.env and never talk to a real
    // database or Supabase project.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://app:app@localhost:5432/app",
      CORS_ORIGIN: "http://localhost:5173",
      SUPABASE_URL: "https://test-ref.supabase.co",
      DEV_LOGIN_ENABLED: "true",
      DEV_LOGIN_SECRET: "test-secret-of-at-least-32-characters",
    },
  },
});
