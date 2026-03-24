import type { Task } from "@autotask/core";
import { CronManager } from "./cron-manager.js";
import type { TaskDispatcher } from "./dispatcher.js";
import type { TaskStore } from "./task-store.js";

export interface SchedulerOptions {
  taskStore: TaskStore;
  dispatcher: TaskDispatcher;
  pollIntervalMs: number;
  logger?: Pick<Console, "info" | "error" | "warn">;
}

/**
 * Core scheduler that loads active tasks, registers them with the CronManager,
 * dispatches jobs via the Dispatcher, and periodically polls for task changes.
 */
export class Scheduler {
  readonly cronManager: CronManager;
  private readonly dispatcher: TaskDispatcher;
  private readonly taskStore: TaskStore;
  private readonly pollIntervalMs: number;
  private readonly logger: Pick<Console, "info" | "error" | "warn">;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(options: SchedulerOptions) {
    this.taskStore = options.taskStore;
    this.dispatcher = options.dispatcher;
    this.pollIntervalMs = options.pollIntervalMs;
    this.logger = options.logger ?? console;

    this.cronManager = new CronManager({
      onTick: (task: Task) => this.handleTick(task),
    });
  }

  /**
   * Start the scheduler: load tasks, register crons, begin polling for changes.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.logger.info("[scheduler] Starting...");
    await this.loadAndSync();

    this.pollTimer = setInterval(() => {
      this.loadAndSync().catch((err: unknown) => {
        this.logger.error("[scheduler] Poll error:", err);
      });
    }, this.pollIntervalMs);

    // Unref so interval doesn't block shutdown
    if (typeof this.pollTimer === "object" && "unref" in this.pollTimer) {
      this.pollTimer.unref();
    }

    this.logger.info("[scheduler] Started");
  }

  /**
   * Graceful shutdown: stop polling, cancel all cron timers, close dispatcher.
   */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    this.logger.info("[scheduler] Stopping...");

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.cronManager.stopAll();
    await this.dispatcher.close();

    this.logger.info("[scheduler] Stopped");
  }

  isRunning(): boolean {
    return this.running;
  }

  private async loadAndSync(): Promise<void> {
    const tasks = await this.taskStore.getActiveTasks();
    this.cronManager.sync(tasks);
    this.logger.info(
      `[scheduler] Synced ${tasks.length} active task(s)`,
    );
  }

  private handleTick(task: Task): void {
    this.logger.info(`[scheduler] Dispatching task ${task.id} (${task.name})`);
    this.dispatcher.dispatch(task).catch((err: unknown) => {
      this.logger.error(
        `[scheduler] Failed to dispatch task ${task.id}:`,
        err,
      );
    });
  }
}
