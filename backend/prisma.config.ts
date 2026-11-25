import { defineConfig, env } from "prisma/config";

// Prisma 7 reads the connection URL here, not from schema.prisma.
try {
  process.loadEnvFile();
} catch {
  // No .env: DATABASE_URL comes from the environment itself (CI, platform).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
