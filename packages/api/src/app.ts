import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "./env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/logger.js";
import { createRunRoutes } from "./routes/runs.js";
import type { RunStore } from "./store/run-store.js";

export interface AppOptions {
  store?: RunStore;
}

export function createApp(options: AppOptions = {}) {
  const env = loadEnv();
  const app = new Hono();

  app.use("*", requestLogger());

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  if (options.store) {
    app.route("/", createRunRoutes(options.store));
  }

  app.onError(errorHandler);

  return app;
}
