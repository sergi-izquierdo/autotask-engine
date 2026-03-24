import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Task, TaskResult, TaskRun, TaskRunStatus } from "./schemas/index.js";
import { TaskExecutionError } from "./errors.js";
import type { TaskRunRepository } from "./task-run-repository.js";

/** Function signature for a task handler */
export type TaskHandler = (
  task: Task,
  signal: AbortSignal,
) => Promise<TaskResult>;

/** Configuration options for the TaskExecutor */
export interface TaskExecutorOptions {
  /** Timeout in milliseconds for each task attempt (default: 30000) */
  timeoutMs?: number;
  /** Maximum number of retry attempts (default: 0 = no retries) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
}

export interface TaskExecutorEvents {
  "task:start": [run: TaskRun];
  "task:complete": [run: TaskRun];
  "task:fail": [run: TaskRun];
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_BASE_DELAY_MS = 1_000;

export class TaskExecutor extends EventEmitter<TaskExecutorEvents> {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly repository: TaskRunRepository | undefined;

  constructor(
    options?: TaskExecutorOptions,
    repository?: TaskRunRepository,
  ) {
    super();
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.repository = repository;
  }

  /**
   * Execute a task using the given handler, with timeout and retry support.
   * Returns the final TaskRun record.
   */
  async execute(task: Task, handler: TaskHandler): Promise<TaskRun> {
    const run = this.createRun(task.id);

    // Transition to running
    run.status = "running";
    run.startedAt = new Date();
    await this.saveRun(run);
    this.emit("task:start", { ...run });

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(attempt);
      }

      try {
        const result = await this.executeWithTimeout(task, handler);
        if (result.success) {
          return await this.completeRun(run, "success", result);
        }
        // Handler returned a failure result (not an exception)
        lastError = new TaskExecutionError(
          task.id,
          result.error ?? "Task handler returned failure",
        );
      } catch (error: unknown) {
        lastError =
          error instanceof Error
            ? error
            : new Error(String(error));
      }
    }

    return await this.completeRun(
      run,
      "failed",
      { success: false, error: lastError?.message ?? "Unknown error" },
      lastError,
    );
  }

  private createRun(taskId: string): TaskRun {
    return {
      id: randomUUID(),
      taskId,
      status: "pending" as TaskRunStatus,
    };
  }

  private async executeWithTimeout(
    task: Task,
    handler: TaskHandler,
  ): Promise<TaskResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await handler(task, controller.signal);
      return result;
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw new TaskExecutionError(
          task.id,
          `Task timed out after ${this.timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async completeRun(
    run: TaskRun,
    status: "success" | "failed",
    result: TaskResult,
    error?: Error,
  ): Promise<TaskRun> {
    run.status = status;
    run.finishedAt = new Date();
    run.result = result;
    if (error) {
      run.error = error.message;
    }

    await this.saveRun(run);

    const event = status === "success" ? "task:complete" : "task:fail";
    this.emit(event, { ...run });

    return { ...run };
  }

  private async saveRun(run: TaskRun): Promise<void> {
    if (this.repository) {
      await this.repository.save({ ...run });
    }
  }

  /** Exponential backoff delay: baseDelay * 2^(attempt-1) */
  private delay(attempt: number): Promise<void> {
    const ms = this.baseDelayMs * Math.pow(2, attempt - 1);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
