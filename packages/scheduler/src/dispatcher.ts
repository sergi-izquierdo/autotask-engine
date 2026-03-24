import { Queue } from "bullmq";
import type { Task } from "@autotask/core";

export interface TaskDispatcher {
  dispatch(task: Task): Promise<string>;
  close(): Promise<void>;
}

export interface DispatcherOptions {
  queueName?: string;
  redisUrl: string;
}

/**
 * Dispatches task execution jobs to BullMQ.
 */
export class Dispatcher implements TaskDispatcher {
  private readonly queue: Queue;

  constructor(options: DispatcherOptions) {
    const url = new URL(options.redisUrl);
    this.queue = new Queue(options.queueName ?? "autotask:jobs", {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
      },
    });
  }

  async dispatch(task: Task): Promise<string> {
    const job = await this.queue.add(
      `task:${task.handler}`,
      {
        taskId: task.id,
        handler: task.handler,
        config: task.config ?? {},
        scheduledAt: new Date().toISOString(),
      },
      {
        jobId: `${task.id}:${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    );
    return job.id ?? task.id;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
