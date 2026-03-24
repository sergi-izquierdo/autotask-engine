import { describe, expect, test, beforeEach } from "bun:test";
import { createApp } from "../app.js";
import { InMemoryRunStore } from "../store/run-store.js";
import { ErrorCode } from "@autotask/core";
import type { Task, TaskRun } from "@autotask/core";

interface RunResponse {
  id: string;
  taskId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  result: { success: boolean; data?: unknown; error?: string } | null;
  error: string | null;
}

interface PaginatedBody {
  data: RunResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface SingleBody {
  data: RunResponse;
}

interface ListBody {
  data: RunResponse[];
}

interface ErrorBody {
  error: { code: string; message: string };
}

const TASK_ID = "11111111-1111-1111-1111-111111111111";
const TASK_ID_2 = "22222222-2222-2222-2222-222222222222";
const RUN_ID_1 = "aaaa1111-1111-1111-1111-111111111111";
const RUN_ID_2 = "aaaa2222-2222-2222-2222-222222222222";
const RUN_ID_3 = "aaaa3333-3333-3333-3333-333333333333";
const RUN_ID_4 = "aaaa4444-4444-4444-4444-444444444444";
const NONEXISTENT_ID = "99999999-9999-9999-9999-999999999999";

function makeTasks(): Task[] {
  return [
    {
      id: TASK_ID,
      name: "Test Task",
      schedule: "*/5 * * * *",
      handler: "test-handler",
      status: "active",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
    {
      id: TASK_ID_2,
      name: "Other Task",
      schedule: "0 * * * *",
      handler: "other-handler",
      status: "active",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
  ];
}

function makeRuns(): TaskRun[] {
  return [
    {
      id: RUN_ID_1,
      taskId: TASK_ID,
      status: "success",
      startedAt: new Date("2025-01-01T10:00:00Z"),
      finishedAt: new Date("2025-01-01T10:00:05Z"),
      result: { success: true, data: { processed: 10 } },
    },
    {
      id: RUN_ID_2,
      taskId: TASK_ID,
      status: "failed",
      startedAt: new Date("2025-01-01T11:00:00Z"),
      finishedAt: new Date("2025-01-01T11:00:02Z"),
      error: "Connection timeout",
    },
    {
      id: RUN_ID_3,
      taskId: TASK_ID,
      status: "running",
      startedAt: new Date("2025-01-01T12:00:00Z"),
    },
    {
      id: RUN_ID_4,
      taskId: TASK_ID_2,
      status: "success",
      startedAt: new Date("2025-01-01T09:00:00Z"),
      finishedAt: new Date("2025-01-01T09:00:03Z"),
      result: { success: true },
    },
  ];
}

let store: InMemoryRunStore;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  store = new InMemoryRunStore();
  store.seedTasks(makeTasks());
  store.seedRuns(makeRuns());
  app = createApp({ store });
});

describe("GET /api/tasks/:id/runs", () => {
  test("returns paginated runs for a task", async () => {
    const res = await app.request("/api/tasks/" + TASK_ID + "/runs");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedBody;
    expect(body.data).toHaveLength(3);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  test("runs are sorted by startedAt descending", async () => {
    const res = await app.request("/api/tasks/" + TASK_ID + "/runs");
    const body = (await res.json()) as PaginatedBody;

    expect(body.data[0].id).toBe(RUN_ID_3);
    expect(body.data[1].id).toBe(RUN_ID_2);
    expect(body.data[2].id).toBe(RUN_ID_1);
  });

  test("pagination works correctly", async () => {
    const res = await app.request(
      "/api/tasks/" + TASK_ID + "/runs?page=2&limit=1",
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(RUN_ID_2);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
  });

  test("returns 404 for nonexistent task", async () => {
    const res = await app.request(
      "/api/tasks/" + NONEXISTENT_ID + "/runs",
    );
    expect(res.status).toBe(404);

    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe(ErrorCode.TASK_NOT_FOUND);
  });

  test("returns 400 for invalid page parameter", async () => {
    const res = await app.request(
      "/api/tasks/" + TASK_ID + "/runs?page=0",
    );
    expect(res.status).toBe(400);

    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  test("returns 400 for invalid limit parameter", async () => {
    const res = await app.request(
      "/api/tasks/" + TASK_ID + "/runs?limit=200",
    );
    expect(res.status).toBe(400);

    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});

describe("GET /api/runs/:id", () => {
  test("returns run details with duration", async () => {
    const res = await app.request("/api/runs/" + RUN_ID_1);
    expect(res.status).toBe(200);

    const body = (await res.json()) as SingleBody;
    expect(body.data.id).toBe(RUN_ID_1);
    expect(body.data.taskId).toBe(TASK_ID);
    expect(body.data.status).toBe("success");
    expect(body.data.durationMs).toBe(5000);
    expect(body.data.startedAt).toBe("2025-01-01T10:00:00.000Z");
    expect(body.data.finishedAt).toBe("2025-01-01T10:00:05.000Z");
    expect(body.data.result).toEqual({ success: true, data: { processed: 10 } });
    expect(body.data.error).toBeNull();
  });

  test("returns run with error details", async () => {
    const res = await app.request("/api/runs/" + RUN_ID_2);
    expect(res.status).toBe(200);

    const body = (await res.json()) as SingleBody;
    expect(body.data.status).toBe("failed");
    expect(body.data.error).toBe("Connection timeout");
    expect(body.data.durationMs).toBe(2000);
  });

  test("running task has null duration", async () => {
    const res = await app.request("/api/runs/" + RUN_ID_3);
    expect(res.status).toBe(200);

    const body = (await res.json()) as SingleBody;
    expect(body.data.status).toBe("running");
    expect(body.data.durationMs).toBeNull();
    expect(body.data.finishedAt).toBeNull();
  });

  test("returns 404 for nonexistent run", async () => {
    const res = await app.request("/api/runs/" + NONEXISTENT_ID);
    expect(res.status).toBe(404);

    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe(ErrorCode.RUN_NOT_FOUND);
  });
});

describe("GET /api/runs/latest", () => {
  test("returns latest runs across all tasks", async () => {
    const res = await app.request("/api/runs/latest");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ListBody;
    expect(body.data).toHaveLength(4);
    // Sorted by startedAt descending
    expect(body.data[0].id).toBe(RUN_ID_3);
    expect(body.data[3].id).toBe(RUN_ID_4);
  });

  test("respects limit parameter", async () => {
    const res = await app.request("/api/runs/latest?limit=2");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ListBody;
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe(RUN_ID_3);
    expect(body.data[1].id).toBe(RUN_ID_2);
  });

  test("returns 400 for invalid limit", async () => {
    const res = await app.request("/api/runs/latest?limit=0");
    expect(res.status).toBe(400);

    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});
