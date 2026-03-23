import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "./env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/logger.js";

export function createApp() {
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

  app.onError(errorHandler);

  return app;
}
