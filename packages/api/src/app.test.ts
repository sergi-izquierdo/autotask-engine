import { describe, expect, test } from "bun:test";
import { createBunWebSocket } from "hono/bun";
import { createApp } from "./app.js";
import { ErrorCode, TaskNotFoundError } from "@autotask/core";

const { upgradeWebSocket } = createBunWebSocket();
const { app } = createApp({ upgradeWebSocket });

describe("Health check", () => {
  test("GET /health returns 200 with ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("Error handling", () => {
  test("AppError is mapped to proper HTTP response", async () => {
    const { app: testApp } = createApp({ upgradeWebSocket });
    testApp.get("/test-error", () => {
      throw new TaskNotFoundError("task-123");
    });

    const res = await testApp.request("/test-error");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: ErrorCode.TASK_NOT_FOUND, message: "Task not found: task-123" },
    });
  });

  test("Unknown errors return 500", async () => {
    const { app: testApp } = createApp({ upgradeWebSocket });
    testApp.get("/test-unknown-error", () => {
      throw new Error("something broke");
    });

    const res = await testApp.request("/test-unknown-error");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });
});

describe("CORS", () => {
  test("CORS headers are present", async () => {
    const res = await app.request("/health", {
      headers: { Origin: "http://localhost:3001" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
