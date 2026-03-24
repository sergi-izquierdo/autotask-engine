import { describe, it, expect, beforeEach, assert } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase, type DrizzleDB } from "../../db/index.js";
import { DrizzleTaskRepository } from "../drizzle-task-repository.js";
import { DrizzleTaskRunRepository } from "../drizzle-task-run-repository.js";

describe("DrizzleTaskRunRepository", () => {
  let db: DrizzleDB;
  let taskRepo: DrizzleTaskRepository;
  let runRepo: DrizzleTaskRunRepository;
  let taskId: string;

  beforeEach(async () => {
    db = createDatabase();
    taskRepo = new DrizzleTaskRepository(db);
    runRepo = new DrizzleTaskRunRepository(db);

    taskId = randomUUID();
    await taskRepo.create({
      id: taskId,
      name: "Test Task",
      schedule: "*/5 * * * *",
      handler: "handlers/test",
    });
  });

  describe("create", () => {
    it("creates a task run with default pending status", async () => {
      const id = randomUUID();
      const run = await runRepo.create({ id, taskId });

      expect(run.id).toBe(id);
      expect(run.taskId).toBe(taskId);
      expect(run.status).toBe("pending");
      expect(run.startedAt).toBeUndefined();
      expect(run.finishedAt).toBeUndefined();
      expect(run.result).toBeUndefined();
      expect(run.error).toBeUndefined();
    });

    it("creates a task run with specified status", async () => {
      const run = await runRepo.create({
        id: randomUUID(),
        taskId,
        status: "running",
      });

      expect(run.status).toBe("running");
    });
  });

  describe("getByTaskId", () => {
    it("returns all runs for a task", async () => {
      await runRepo.create({ id: randomUUID(), taskId });
      await runRepo.create({ id: randomUUID(), taskId });

      const runs = await runRepo.getByTaskId(taskId);
      expect(runs).toHaveLength(2);
      expect(runs.every((r) => r.taskId === taskId)).toBe(true);
    });

    it("returns empty array for task with no runs", async () => {
      const runs = await runRepo.getByTaskId(randomUUID());
      expect(runs).toEqual([]);
    });
  });

  describe("getLatest", () => {
    it("returns the most recent run for a task", async () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      await runRepo.create({ id: id1, taskId });
      await runRepo.create({ id: id2, taskId });

      const latest = await runRepo.getLatest(taskId);
      assert(latest !== null, "latest run should exist");
      // The last inserted should be returned (ordered by rowid desc)
      expect(latest.id).toBe(id2);
    });

    it("returns null when no runs exist", async () => {
      const latest = await runRepo.getLatest(randomUUID());
      expect(latest).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates the status of a run", async () => {
      const id = randomUUID();
      await runRepo.create({ id, taskId });

      const updated = await runRepo.updateStatus(id, { status: "running" });

      assert(updated !== null, "updated run should exist");
      expect(updated.status).toBe("running");
    });

    it("updates status with timestamps and result", async () => {
      const id = randomUUID();
      await runRepo.create({ id, taskId });

      const startedAt = new Date("2025-01-01T00:00:00Z");
      const finishedAt = new Date("2025-01-01T00:01:00Z");
      const result = { success: true, data: { count: 42 } };

      const updated = await runRepo.updateStatus(id, {
        status: "success",
        startedAt,
        finishedAt,
        result,
      });

      assert(updated !== null, "updated run should exist");
      expect(updated.status).toBe("success");
      expect(updated.startedAt).toEqual(startedAt);
      expect(updated.finishedAt).toEqual(finishedAt);
      expect(updated.result).toEqual(result);
    });

    it("updates status with error", async () => {
      const id = randomUUID();
      await runRepo.create({ id, taskId });

      const updated = await runRepo.updateStatus(id, {
        status: "failed",
        error: "Something went wrong",
      });

      assert(updated !== null, "updated run should exist");
      expect(updated.status).toBe("failed");
      expect(updated.error).toBe("Something went wrong");
    });

    it("returns null for non-existent run", async () => {
      const result = await runRepo.updateStatus(randomUUID(), {
        status: "running",
      });
      expect(result).toBeNull();
    });
  });
});
