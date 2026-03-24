import { describe, it, expect, beforeAll } from "vitest";
import { api } from "./helpers/api-client.js";
import { poll } from "./helpers/poll.js";

/**
 * E2E smoke test: task create → schedule → execute → view
 *
 * Requires running services (API, scheduler, Redis).
 * Start with: docker compose up -d
 *
 * Environment variables:
 *   API_URL  – defaults to http://localhost:3001
 */

interface Task {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  handler: string;
  config?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskRun {
  id: string;
  taskId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  result?: { success: boolean; data?: unknown; error?: string };
  error?: string;
}

describe("Smoke: task create → schedule → execute → view", () => {
  let taskId: string;
  let runId: string;

  // ── Pre-check: API is reachable ──────────────────────────────
  beforeAll(async () => {
    const health = await api.get<{ status: string }>("/health");
    expect(health.status).toBe(200);
    expect(health.data.status).toBe("ok");
  });

  // ── Step 1: Create a task via API ────────────────────────────
  it("creates a task via POST /tasks", async () => {
    const payload = {
      name: "e2e-smoke-test",
      description: "Smoke test task created by E2E suite",
      schedule: "*/5 * * * *",
      handler: "log",
      config: { message: "hello from e2e" },
    };

    const res = await api.post<Task>("/tasks", payload);

    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
      name: "e2e-smoke-test",
      schedule: "*/5 * * * *",
      handler: "log",
      status: "active",
    });
    expect(res.data.id).toBeDefined();

    taskId = res.data.id;
  });

  // ── Step 2: Verify task retrievable ──────────────────────────
  it("retrieves the created task via GET /tasks/:id", async () => {
    const res = await api.get<Task>(`/tasks/${taskId}`);

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(taskId);
    expect(res.data.name).toBe("e2e-smoke-test");
  });

  // ── Step 3: Verify task appears in scheduler ─────────────────
  it("verifies task is registered in the scheduler", async () => {
    const res = await poll(
      () => api.get<{ scheduled: boolean }>(`/tasks/${taskId}/schedule`),
      (r) => r.status === 200 && r.data.scheduled === true,
      { timeout: 10_000, interval: 1_000 },
    );

    expect(res.data.scheduled).toBe(true);
  });

  // ── Step 4: Trigger a run and wait for completion ────────────
  it("triggers a task run via POST /tasks/:id/runs", async () => {
    const res = await api.post<TaskRun>(`/tasks/${taskId}/runs`);

    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    expect(res.data.taskId).toBe(taskId);

    runId = res.data.id;
  });

  it("waits for the run to complete", async () => {
    const completed = await poll(
      () => api.get<TaskRun>(`/tasks/${taskId}/runs/${runId}`),
      (r) => r.data.status === "success" || r.data.status === "failed",
      { timeout: 30_000, interval: 1_000 },
    );

    expect(completed.data.status).toBe("success");
    expect(completed.data.finishedAt).toBeDefined();
  });

  // ── Step 5: Verify run recorded in database ──────────────────
  it("verifies run is recorded and retrievable", async () => {
    const res = await api.get<TaskRun>(`/tasks/${taskId}/runs/${runId}`);

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      id: runId,
      taskId: taskId,
      status: "success",
    });
    expect(res.data.result).toBeDefined();
    expect(res.data.result?.success).toBe(true);
  });

  // ── Step 6: Verify task appears in task list ─────────────────
  it("verifies task appears in GET /tasks list", async () => {
    const res = await api.get<Task[]>("/tasks");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const found = res.data.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("e2e-smoke-test");
  });

  // ── Step 7: Verify run appears in runs list ──────────────────
  it("verifies run appears in GET /tasks/:id/runs list", async () => {
    const res = await api.get<TaskRun[]>(`/tasks/${taskId}/runs`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const found = res.data.find((r) => r.id === runId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("success");
  });

  // ── Cleanup ──────────────────────────────────────────────────
  it("cleans up the smoke test task", async () => {
    const res = await api.delete(`/tasks/${taskId}`);

    expect(res.status).toBe(200);
  });
});
