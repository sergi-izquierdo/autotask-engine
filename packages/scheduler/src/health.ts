import { Hono } from "hono";
import type { CronManager } from "./cron-manager.js";

export interface HealthOptions {
  cronManager: CronManager;
}

export function createHealthApp(options: HealthOptions): Hono {
  const app = new Hono();

  app.get("/health", (c) => {
    const scheduledIds = options.cronManager.getScheduledTaskIds();
    return c.json({
      status: "ok",
      scheduledTasks: scheduledIds.length,
      uptime: process.uptime(),
    });
  });

  return app;
}
