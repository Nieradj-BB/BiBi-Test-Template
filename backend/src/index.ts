import { app } from "./app";
import { startServer } from "./server";

/* The production entry point (`node dist/index.js`). Locally `npm run dev`
   starts the backend through `dev/server.ts`, with the dev login. */
startServer(app);
