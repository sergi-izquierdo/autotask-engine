import { describe, it, expect, vi } from "vitest";
import { createHealthApp } from "../health.js";
import type { CronManager } from "../cron-manager.js";

function createMockCronManager(taskIds: string[]): CronManager {
  return {
    getScheduledTaskIds: vi.fn(() => taskIds),
  } as unknown as CronManager;
}

describe("Health endpoint", () => {
  it("returns status ok with scheduled task count", async () => {
    const cronManager = createMockCronManager(["t1", "t2"]);
    const app = createHealthApp({ cronManager });

    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body["status"]).toBe("ok");
    expect(body["scheduledTasks"]).toBe(2);
    expect(typeof body["uptime"]).toBe("number");
  });

  it("returns zero when no tasks scheduled", async () => {
    const cronManager = createMockCronManager([]);
    const app = createHealthApp({ cronManager });

    const res = await app.request("/health");
    const body = (await res.json()) as Record<string, unknown>;

    expect(body["scheduledTasks"]).toBe(0);
  });
});
