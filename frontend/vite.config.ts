import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // The frontend talks to the backend through the relative path /api,
      // which the dev server forwards. That works on localhost and through a
      // forwarded URL (Codespaces), where "localhost" in the browser means the
      // user's own machine. It mirrors production: frontend and backend on one
      // origin, the backend under /api. 127.0.0.1, because the dev backend
      // listens there only. API_PROXY_TARGET: another backend port, for
      // example when several apps run side by side.
      proxy: {
        "/api": env.API_PROXY_TARGET || "http://127.0.0.1:3001",
      },
    },
  };
});
