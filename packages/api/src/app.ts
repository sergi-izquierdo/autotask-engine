import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "./env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/logger.js";
import { createTaskRoutes } from "./routes/tasks.js";
import { TaskStore } from "./store/task-store.js";

export function createApp(taskStore?: TaskStore) {
  const env = loadEnv();
  const app = new Hono();
  const store = taskStore ?? new TaskStore();

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

  app.route("/api/tasks", createTaskRoutes(store));

  app.onError(errorHandler);

  return app;
}
