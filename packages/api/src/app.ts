import { Hono } from "hono";
import { cors } from "hono/cors";
import type { createBunWebSocket } from "hono/bun";
import { loadEnv } from "./env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/logger.js";
import { ConnectionManager, registerWebSocketRoute } from "./ws/index.js";

export interface AppOptions {
  upgradeWebSocket: ReturnType<typeof createBunWebSocket>["upgradeWebSocket"];
}

export interface AppInstance {
  app: Hono;
  connectionManager: ConnectionManager;
}

export function createApp(options: AppOptions): AppInstance {
  const env = loadEnv();
  const app = new Hono();
  const connectionManager = new ConnectionManager();

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

  registerWebSocketRoute(app, options.upgradeWebSocket, connectionManager);

  app.onError(errorHandler);

  return { app, connectionManager };
}
