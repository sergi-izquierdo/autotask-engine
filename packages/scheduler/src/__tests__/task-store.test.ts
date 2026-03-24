import { describe, it, expect } from "vitest";
import { InMemoryTaskStore } from "../task-store.js";
import type { Task } from "@autotask/core";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    name: "Test Task",
    schedule: "* * * * *",
    handler: "handlers/test",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("InMemoryTaskStore", () => {
  it("returns empty array when no tasks set", async () => {
    const store = new InMemoryTaskStore();
    const tasks = await store.getActiveTasks();
    expect(tasks).toEqual([]);
  });

  it("returns only active tasks", async () => {
    const store = new InMemoryTaskStore();
    store.setTasks([
      makeTask({ id: "1", status: "active" }),
      makeTask({ id: "2", status: "inactive" }),
      makeTask({ id: "3", status: "archived" }),
      makeTask({ id: "4", status: "active" }),
    ]);

    const tasks = await store.getActiveTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id)).toEqual(["1", "4"]);
  });

  it("does not mutate internal state when setTasks is called", async () => {
    const store = new InMemoryTaskStore();
    const original = [makeTask()];
    store.setTasks(original);

    original.push(makeTask({ id: "extra" }));

    const tasks = await store.getActiveTasks();
    expect(tasks).toHaveLength(1);
  });
});
