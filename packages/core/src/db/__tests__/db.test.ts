import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../connection.js";
import { runMigrations } from "../migrate.js";
import {
  insertTask,
  getTaskById,
  listTasks,
  updateTask,
  deleteTask,
  insertTaskRun,
  getTaskRunById,
  listTaskRunsByTaskId,
  updateTaskRun,
} from "../queries.js";
import type { AppDatabase } from "../connection.js";

function makeDb(): AppDatabase {
  const db = createDatabase({ dbPath: ":memory:" });
  runMigrations(db);
  return db;
}

function sampleTask() {
  return {
    id: randomUUID(),
    name: "Test Task",
    schedule: "*/5 * * * *",
    handler: "test-handler",
  };
}

describe("tasks", () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = makeDb();
  });

  it("inserts and retrieves a task", () => {
    const task = sampleTask();
    const inserted = insertTask(db, task);

    expect(inserted.id).toBe(task.id);
    expect(inserted.name).toBe("Test Task");
    expect(inserted.status).toBe("active");
    expect(inserted.createdAt).toBeDefined();

    const found = getTaskById(db, task.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Test Task");
  });

  it("lists all tasks", () => {
    insertTask(db, sampleTask());
    insertTask(db, { ...sampleTask(), name: "Second Task" });

    const all = listTasks(db);
    expect(all).toHaveLength(2);
  });

  it("updates a task", () => {
    const task = sampleTask();
    insertTask(db, task);

    const updated = updateTask(db, task.id, {
      name: "Updated Name",
      status: "inactive",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.status).toBe("inactive");
  });

  it("deletes a task", () => {
    const task = sampleTask();
    insertTask(db, task);

    const deleted = deleteTask(db, task.id);
    expect(deleted).toBeDefined();
    expect(deleted?.id).toBe(task.id);

    const found = getTaskById(db, task.id);
    expect(found).toBeUndefined();
  });

  it("stores and retrieves config as JSON", () => {
    const task = sampleTask();
    const config = { url: "https://example.com", retries: 3 };
    insertTask(db, { ...task, config });

    const found = getTaskById(db, task.id);
    expect(found?.config).toEqual(config);
  });

  it("stores optional description", () => {
    const task = sampleTask();
    insertTask(db, { ...task, description: "A test task description" });

    const found = getTaskById(db, task.id);
    expect(found?.description).toBe("A test task description");
  });
});

describe("taskRuns", () => {
  let db: AppDatabase;
  let taskId: string;

  beforeEach(() => {
    db = makeDb();
    const task = sampleTask();
    insertTask(db, task);
    taskId = task.id;
  });

  it("inserts and retrieves a task run", () => {
    const runId = randomUUID();
    const inserted = insertTaskRun(db, { id: runId, taskId });

    expect(inserted.id).toBe(runId);
    expect(inserted.status).toBe("pending");

    const found = getTaskRunById(db, runId);
    expect(found).toBeDefined();
    expect(found?.taskId).toBe(taskId);
  });

  it("lists runs by task ID", () => {
    insertTaskRun(db, { id: randomUUID(), taskId });
    insertTaskRun(db, { id: randomUUID(), taskId });

    const runs = listTaskRunsByTaskId(db, taskId);
    expect(runs).toHaveLength(2);
  });

  it("updates a task run status and timestamps", () => {
    const runId = randomUUID();
    insertTaskRun(db, { id: runId, taskId });

    const now = new Date().toISOString();
    const updated = updateTaskRun(db, runId, {
      status: "running",
      startedAt: now,
    });

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("running");
    expect(updated?.startedAt).toBe(now);
  });

  it("stores result as JSON", () => {
    const runId = randomUUID();
    insertTaskRun(db, { id: runId, taskId });

    const result = { success: true, data: { count: 42 } };
    const updated = updateTaskRun(db, runId, {
      status: "success",
      result,
      finishedAt: new Date().toISOString(),
    });

    expect(updated?.result).toEqual(result);
  });

  it("stores error message on failure", () => {
    const runId = randomUUID();
    insertTaskRun(db, { id: runId, taskId });

    const updated = updateTaskRun(db, runId, {
      status: "failed",
      error: "Connection timeout",
      finishedAt: new Date().toISOString(),
    });

    expect(updated?.status).toBe("failed");
    expect(updated?.error).toBe("Connection timeout");
  });

  it("enforces foreign key on taskId", () => {
    expect(() =>
      insertTaskRun(db, { id: randomUUID(), taskId: randomUUID() }),
    ).toThrow();
  });
});
