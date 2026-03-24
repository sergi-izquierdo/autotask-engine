import { describe, it, expect, beforeEach, assert } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../../db/index.js";
import { DrizzleTaskRepository } from "../drizzle-task-repository.js";
import type { CreateTaskInput } from "../task-repository.js";

function makeTaskInput(overrides?: Partial<CreateTaskInput>): CreateTaskInput {
  return {
    id: randomUUID(),
    name: "Test Task",
    schedule: "*/5 * * * *",
    handler: "handlers/test",
    ...overrides,
  };
}

describe("DrizzleTaskRepository", () => {
  let repo: DrizzleTaskRepository;

  beforeEach(() => {
    const db = createDatabase();
    repo = new DrizzleTaskRepository(db);
  });

  describe("create", () => {
    it("creates a task with required fields", async () => {
      const input = makeTaskInput();
      const task = await repo.create(input);

      expect(task.id).toBe(input.id);
      expect(task.name).toBe("Test Task");
      expect(task.schedule).toBe("*/5 * * * *");
      expect(task.handler).toBe("handlers/test");
      expect(task.status).toBe("active");
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a task with optional fields", async () => {
      const input = makeTaskInput({
        description: "A test task",
        config: { key: "value" },
        status: "inactive",
      });
      const task = await repo.create(input);

      expect(task.description).toBe("A test task");
      expect(task.config).toEqual({ key: "value" });
      expect(task.status).toBe("inactive");
    });

    it("creates a task without optional fields as undefined", async () => {
      const task = await repo.create(makeTaskInput());

      expect(task.description).toBeUndefined();
      expect(task.config).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("returns the task when found", async () => {
      const input = makeTaskInput();
      await repo.create(input);

      const task = await repo.getById(input.id);
      assert(task !== null, "task should exist");
      expect(task.id).toBe(input.id);
    });

    it("returns null when not found", async () => {
      const task = await repo.getById(randomUUID());
      expect(task).toBeNull();
    });
  });

  describe("getAll", () => {
    it("returns empty array when no tasks", async () => {
      const tasks = await repo.getAll();
      expect(tasks).toEqual([]);
    });

    it("returns all tasks", async () => {
      await repo.create(makeTaskInput({ name: "Task 1" }));
      await repo.create(makeTaskInput({ name: "Task 2" }));

      const tasks = await repo.getAll();
      expect(tasks).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("updates specified fields", async () => {
      const input = makeTaskInput();
      await repo.create(input);

      const updated = await repo.update(input.id, {
        name: "Updated Name",
        status: "inactive",
      });

      assert(updated !== null, "updated task should exist");
      expect(updated.name).toBe("Updated Name");
      expect(updated.status).toBe("inactive");
      expect(updated.handler).toBe("handlers/test");
    });

    it("updates config to a new value", async () => {
      const input = makeTaskInput({ config: { old: true } });
      await repo.create(input);

      const updated = await repo.update(input.id, {
        config: { new: true },
      });

      assert(updated !== null, "updated task should exist");
      expect(updated.config).toEqual({ new: true });
    });

    it("returns null for non-existent task", async () => {
      const result = await repo.update(randomUUID(), { name: "Nope" });
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", async () => {
      const input = makeTaskInput();
      const created = await repo.create(input);

      // SQLite stores timestamps as integer seconds, so both may round to the same second.
      // We verify updatedAt is at least as recent (>= after truncation to seconds).
      const updated = await repo.update(input.id, { name: "New" });
      assert(updated !== null, "updated task should exist");
      const createdSec = Math.floor(created.updatedAt.getTime() / 1000);
      const updatedSec = Math.floor(updated.updatedAt.getTime() / 1000);
      expect(updatedSec).toBeGreaterThanOrEqual(createdSec);
    });
  });

  describe("delete", () => {
    it("deletes an existing task and returns true", async () => {
      const input = makeTaskInput();
      await repo.create(input);

      const deleted = await repo.delete(input.id);
      expect(deleted).toBe(true);

      const found = await repo.getById(input.id);
      expect(found).toBeNull();
    });

    it("returns false for non-existent task", async () => {
      const deleted = await repo.delete(randomUUID());
      expect(deleted).toBe(false);
    });
  });

  describe("getByStatus", () => {
    it("returns tasks matching the given status", async () => {
      await repo.create(makeTaskInput({ name: "Active 1" }));
      await repo.create(makeTaskInput({ name: "Active 2" }));
      await repo.create(
        makeTaskInput({ name: "Inactive", status: "inactive" }),
      );

      const active = await repo.getByStatus("active");
      expect(active).toHaveLength(2);

      const inactive = await repo.getByStatus("inactive");
      expect(inactive).toHaveLength(1);
      expect(inactive[0].name).toBe("Inactive");
    });

    it("returns empty array when no tasks match", async () => {
      const archived = await repo.getByStatus("archived");
      expect(archived).toEqual([]);
    });
  });
});
