import { serve } from "@hono/node-server";
import { loadEnv } from "./env.js";
import { Scheduler } from "./scheduler.js";
import { Dispatcher } from "./dispatcher.js";
import { InMemoryTaskStore } from "./task-store.js";
import { createHealthApp } from "./health.js";

const env = loadEnv();

const taskStore = new InMemoryTaskStore();
const dispatcher = new Dispatcher({ redisUrl: env.REDIS_URL });

const scheduler = new Scheduler({
  taskStore,
  dispatcher,
  pollIntervalMs: env.POLL_INTERVAL_MS,
});

const healthApp = createHealthApp({ cronManager: scheduler.cronManager });

const server = serve({ fetch: healthApp.fetch, port: env.HEALTH_PORT }, () => {
  console.info(`[scheduler] Health check listening on port ${env.HEALTH_PORT}`);
});

await scheduler.start();

function shutdown() {
  console.info("[scheduler] Received shutdown signal");
  scheduler
    .stop()
    .then(() => {
      server.close();
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("[scheduler] Shutdown error:", err);
      process.exit(1);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
