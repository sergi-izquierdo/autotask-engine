import { CronExpressionParser } from "cron-parser";
import { ScheduleError } from "@autotask/core";
import type { Task } from "@autotask/core";

export interface ScheduledTask {
  task: Task;
  timer: ReturnType<typeof setTimeout>;
  nextRun: Date;
}

export interface CronManagerOptions {
  onTick: (task: Task) => void;
}

/**
 * Manages cron-based timers for tasks. Parses cron expressions, schedules
 * the next tick for each task, and re-arms after each firing.
 */
export class CronManager {
  private scheduled = new Map<string, ScheduledTask>();
  private readonly onTick: (task: Task) => void;
  private stopped = false;

  constructor(options: CronManagerOptions) {
    this.onTick = options.onTick;
  }

  /**
   * Register or re-register a task. Cancels any existing timer for the same task ID.
   */
  register(task: Task): void {
    this.unregister(task.id);

    const nextRun = this.getNextRun(task.schedule, task.id);
    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(() => {
      if (this.stopped) return;
      this.onTick(task);
      // Re-arm for next occurrence
      if (!this.stopped && this.scheduled.has(task.id)) {
        this.register(task);
      }
    }, Math.max(delay, 0));

    // Unref so the timer doesn't keep the process alive during shutdown
    if (typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }

    this.scheduled.set(task.id, { task, timer, nextRun });
  }

  /**
   * Remove a task's scheduled timer.
   */
  unregister(taskId: string): void {
    const entry = this.scheduled.get(taskId);
    if (entry) {
      clearTimeout(entry.timer);
      this.scheduled.delete(taskId);
    }
  }

  /**
   * Sync the set of registered tasks with the provided list.
   * Adds new tasks, updates changed schedules, removes tasks no longer present.
   */
  sync(tasks: Task[]): void {
    const activeIds = new Set(tasks.map((t) => t.id));

    // Remove tasks that are no longer in the list
    for (const id of this.scheduled.keys()) {
      if (!activeIds.has(id)) {
        this.unregister(id);
      }
    }

    // Register or update tasks
    for (const task of tasks) {
      const existing = this.scheduled.get(task.id);
      if (!existing || existing.task.schedule !== task.schedule) {
        this.register(task);
      }
    }
  }

  /**
   * Cancel all timers.
   */
  stopAll(): void {
    this.stopped = true;
    for (const entry of this.scheduled.values()) {
      clearTimeout(entry.timer);
    }
    this.scheduled.clear();
  }

  getScheduledTaskIds(): string[] {
    return [...this.scheduled.keys()];
  }

  getNextRunTime(taskId: string): Date | undefined {
    return this.scheduled.get(taskId)?.nextRun;
  }

  private getNextRun(expression: string, taskId: string): Date {
    try {
      const expr = CronExpressionParser.parse(expression);
      return expr.next().toDate();
    } catch (cause) {
      throw new ScheduleError(
        `Invalid cron expression for task ${taskId}: ${expression}`,
        expression,
        cause instanceof Error ? cause : undefined,
      );
    }
  }
}
