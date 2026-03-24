import type { Task } from "@autotask/core";

/**
 * Interface for loading tasks. Allows swapping real DB for in-memory store in tests.
 */
export interface TaskStore {
  getActiveTasks(): Promise<Task[]>;
}

/**
 * In-memory task store for development and testing.
 */
export class InMemoryTaskStore implements TaskStore {
  private tasks: Task[] = [];

  setTasks(tasks: Task[]): void {
    this.tasks = [...tasks];
  }

  async getActiveTasks(): Promise<Task[]> {
    return this.tasks.filter((t) => t.status === "active");
  }
}
