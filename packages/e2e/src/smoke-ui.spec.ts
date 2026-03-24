import { test, expect } from "@playwright/test";

/**
 * E2E Playwright smoke test: verify task and run visible in web UI.
 *
 * Requires all services running (API, scheduler, web, Redis).
 * Start with: docker compose up -d
 *
 * Environment variables:
 *   API_URL  – defaults to http://localhost:3001
 *   WEB_URL  – defaults to http://localhost:3000
 */

const API_URL = process.env.API_URL ?? "http://localhost:3001";

interface Task {
  id: string;
  name: string;
}

interface TaskRun {
  id: string;
  taskId: string;
  status: string;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  return res.json() as Promise<T>;
}

async function apiDelete(path: string): Promise<void> {
  await fetch(`${API_URL}${path}`, { method: "DELETE" });
}

async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (v: T) => boolean,
  timeout = 30_000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (predicate(result)) return result;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error("pollUntil timed out");
}

test.describe("Smoke UI: task and run visible in web dashboard", () => {
  let taskId: string;

  test.beforeAll(async () => {
    // Create a task via API
    const task = await apiPost<Task>("/tasks", {
      name: "e2e-ui-smoke-test",
      description: "UI smoke test task",
      schedule: "*/5 * * * *",
      handler: "log",
      config: { message: "ui smoke" },
    });
    taskId = task.id;

    // Trigger a run and wait for completion
    const run = await apiPost<TaskRun>(`/tasks/${taskId}/runs`, {});
    await pollUntil(
      () => apiGet<TaskRun>(`/tasks/${taskId}/runs/${run.id}`),
      (r) => r.status === "success" || r.status === "failed",
    );
  });

  test.afterAll(async () => {
    if (taskId) {
      await apiDelete(`/tasks/${taskId}`);
    }
  });

  test("task is visible on the tasks page", async ({ page }) => {
    await page.goto("/tasks");

    // Wait for the tasks page to load and show our task
    await expect(page.getByText("e2e-ui-smoke-test")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("task detail page shows task info", async ({ page }) => {
    await page.goto(`/tasks/${taskId}`);

    await expect(page.getByText("e2e-ui-smoke-test")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("*/5 * * * *")).toBeVisible();
  });

  test("task runs are visible on the task detail page", async ({ page }) => {
    await page.goto(`/tasks/${taskId}`);

    // Look for a run entry with success status
    await expect(page.getByText("success")).toBeVisible({ timeout: 10_000 });
  });
});
