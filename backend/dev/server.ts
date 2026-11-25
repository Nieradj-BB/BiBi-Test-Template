import { app } from "../src/app";
import { logger } from "../src/config/logger";
import { startServer } from "../src/server";
import { checkLocation, loadDevConfig } from "./devConfig";
import { withDevLogin } from "./devLogin";

/**
 * The backend locally and in a Codespace (`npm run dev`): the same app as in
 * production, plus the dev login when DEV_LOGIN_ENABLED=true. This folder sits
 * outside `src/`, so it is never in `dist/`. Importing `app` loads `.env` first.
 */
const config = loadDevConfig();
if (config.enabled) {
  const location = checkLocation();
  logger.warn(
    { host: location.host, ownHostOnly: location.ownHostOnly },
    "Dev login is on: the sign-in page signs in with one click as a test user or test admin. Development only.",
  );
  startServer(
    withDevLogin(app, { ownHostOnly: location.ownHostOnly }),
    location.host,
  );
} else {
  startServer(app);
}
