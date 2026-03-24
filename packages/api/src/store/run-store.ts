import type { Task, TaskRun } from "@autotask/core";

export interface RunStore {
  getTasks(): Task[];
  getTask(id: string): Task | undefined;
  getRuns(): TaskRun[];
  getRunsByTaskId(taskId: string): TaskRun[];
  getRun(id: string): TaskRun | undefined;
}

export class InMemoryRunStore implements RunStore {
  private tasks: Map<string, Task> = new Map();
  private runs: Map<string, TaskRun> = new Map();

  seedTasks(tasks: Task[]): void {
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  seedRuns(runs: TaskRun[]): void {
    for (const run of runs) {
      this.runs.set(run.id, run);
    }
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getRuns(): TaskRun[] {
    return Array.from(this.runs.values());
  }

  getRunsByTaskId(taskId: string): TaskRun[] {
    return Array.from(this.runs.values()).filter((r) => r.taskId === taskId);
  }

  getRun(id: string): TaskRun | undefined {
    return this.runs.get(id);
  }
}
