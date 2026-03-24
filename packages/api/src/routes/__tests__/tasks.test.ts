import { describe, expect, test } from "bun:test";
import { createApp } from "../../app.js";
import { TaskStore } from "../../store/task-store.js";
import type { Task } from "@autotask/core";

interface TaskResponse {
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

interface ListResponse {
  data: TaskResponse[];
  total: number;
  page: number;
  limit: number;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

interface RunResponse {
  id: string;
  taskId: string;
  status: string;
  startedAt: string;
}

function createTestTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: "Test Task",
    schedule: "*/5 * * * *",
    handler: "test-handler",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function json(body: Record<string, unknown>) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function jsonPut(body: Record<string, unknown>) {
  return {
    method: "PUT" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("POST /api/tasks", () => {
  test("creates a task with valid body", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/tasks",
      json({
        name: "My Task",
        schedule: "0 * * * *",
        handler: "my-handler",
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as TaskResponse;
    expect(body.name).toBe("My Task");
    expect(body.schedule).toBe("0 * * * *");
    expect(body.handler).toBe("my-handler");
    expect(body.status).toBe("active");
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  test("creates a task with optional fields", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/tasks",
      json({
        name: "Full Task",
        schedule: "0 0 * * *",
        handler: "full-handler",
        description: "A detailed description",
        config: { key: "value" },
        status: "inactive",
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as TaskResponse;
    expect(body.description).toBe("A detailed description");
    expect(body.config).toEqual({ key: "value" });
    expect(body.status).toBe("inactive");
  });

  test("returns 400 for missing required fields", async () => {
    const app = createApp();
    const res = await app.request("/api/tasks", json({ name: "Incomplete" }));

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 for empty name", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/tasks",
      json({ name: "", schedule: "* * * * *", handler: "h" }),
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tasks", () => {
  test("returns empty list when no tasks exist", async () => {
    const app = createApp();
    const res = await app.request("/api/tasks");

    expect(res.status).toBe(200);
    const body = (await res.json()) as ListResponse;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  test("returns tasks with pagination metadata", async () => {
    const store = new TaskStore();
    store.create(createTestTask({ name: "Task 1" }));
    store.create(createTestTask({ name: "Task 2" }));
    const app = createApp(store);

    const res = await app.request("/api/tasks");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ListResponse;
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  test("filters by status", async () => {
    const store = new TaskStore();
    store.create(createTestTask({ name: "Active", status: "active" }));
    store.create(createTestTask({ name: "Inactive", status: "inactive" }));
    const app = createApp(store);

    const res = await app.request("/api/tasks?status=active");
    const body = (await res.json()) as ListResponse;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Active");
  });

  test("supports pagination", async () => {
    const store = new TaskStore();
    for (let i = 0; i < 5; i++) {
      store.create(createTestTask({ name: `Task ${i}` }));
    }
    const app = createApp(store);

    const res = await app.request("/api/tasks?page=2&limit=2");
    const body = (await res.json()) as ListResponse;
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(5);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(2);
  });

  test("returns 400 for invalid status filter", async () => {
    const app = createApp();
    const res = await app.request("/api/tasks?status=bogus");

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tasks/:id", () => {
  test("returns task by ID", async () => {
    const store = new TaskStore();
    const task = createTestTask({ name: "Find Me" });
    store.create(task);
    const app = createApp(store);

    const res = await app.request(`/api/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as TaskResponse;
    expect(body.name).toBe("Find Me");
    expect(body.id).toBe(task.id);
  });

  test("returns 404 for non-existent task", async () => {
    const app = createApp();
    const res = await app.request(`/api/tasks/${crypto.randomUUID()}`);

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("PUT /api/tasks/:id", () => {
  test("updates task fields", async () => {
    const store = new TaskStore();
    const task = createTestTask({ name: "Old Name" });
    store.create(task);
    const app = createApp(store);

    const res = await app.request(
      `/api/tasks/${task.id}`,
      jsonPut({ name: "New Name", status: "inactive" }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as TaskResponse;
    expect(body.name).toBe("New Name");
    expect(body.status).toBe("inactive");
    expect(body.id).toBe(task.id);
  });

  test("returns 404 for non-existent task", async () => {
    const app = createApp();
    const res = await app.request(
      `/api/tasks/${crypto.randomUUID()}`,
      jsonPut({ name: "Nope" }),
    );

    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid update data", async () => {
    const store = new TaskStore();
    const task = createTestTask();
    store.create(task);
    const app = createApp(store);

    const res = await app.request(
      `/api/tasks/${task.id}`,
      jsonPut({ status: "invalid-status" }),
    );

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/:id", () => {
  test("deletes existing task", async () => {
    const store = new TaskStore();
    const task = createTestTask();
    store.create(task);
    const app = createApp(store);

    const res = await app.request(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify it's gone
    const getRes = await app.request(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(404);
  });

  test("returns 404 for non-existent task", async () => {
    const app = createApp();
    const res = await app.request(`/api/tasks/${crypto.randomUUID()}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/tasks/:id/run", () => {
  test("triggers execution for existing task", async () => {
    const store = new TaskStore();
    const task = createTestTask();
    store.create(task);
    const app = createApp(store);

    const res = await app.request(`/api/tasks/${task.id}/run`, {
      method: "POST",
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as RunResponse;
    expect(body.taskId).toBe(task.id);
    expect(body.status).toBe("pending");
    expect(body.id).toBeDefined();
    expect(body.startedAt).toBeDefined();
  });

  test("returns 404 for non-existent task", async () => {
    const app = createApp();
    const res = await app.request(`/api/tasks/${crypto.randomUUID()}/run`, {
      method: "POST",
    });

    expect(res.status).toBe(404);
  });
});
