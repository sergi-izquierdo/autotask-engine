import type { Task, TaskStatus } from "@autotask/core";

export interface ListTasksOptions {
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export class TaskStore {
  private tasks: Map<string, Task> = new Map();

  create(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(options: ListTasksOptions = {}): PaginatedResult<Task> {
    const { status, page = 1, limit = 20 } = options;

    let tasks = Array.from(this.tasks.values());

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    const total = tasks.length;
    const start = (page - 1) * limit;
    const data = tasks.slice(start, start + limit);

    return { data, total, page, limit };
  }

  update(id: string, updates: Partial<Task>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated: Task = { ...existing, ...updates, id: existing.id, updatedAt: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
