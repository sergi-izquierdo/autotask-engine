import { Queue, Worker, QueueEvents, type Job, type Processor } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { type QueueJobData, type QueueJobResult, parseJobData } from "./job-schema.js";
import { getRedisConfig, toConnectionOptions } from "./redis-config.js";

export type TaskQueueEventType =
  | "job:added"
  | "job:active"
  | "job:completed"
  | "job:failed"
  | "job:stalled"
  | "job:moved-to-dlq";

export interface TaskQueueEvent {
  type: TaskQueueEventType;
  jobId: string;
  data?: QueueJobData;
  result?: QueueJobResult;
  error?: string;
  timestamp: Date;
}

export type TaskQueueEventHandler = (event: TaskQueueEvent) => void;

export interface TaskQueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface TaskQueueOptions {
  connection?: ConnectionOptions;
  queueName?: string;
  maxRetries?: number;
  deadLetterQueueName?: string;
}

const DEFAULT_QUEUE_NAME = "autotask:tasks";
const DEFAULT_DLQ_NAME = "autotask:tasks:dlq";
const DEFAULT_MAX_RETRIES = 3;

export class TaskQueue {
  private readonly queue: Queue<QueueJobData, QueueJobResult>;
  private readonly dlq: Queue<QueueJobData>;
  private readonly connection: ConnectionOptions;
  private readonly maxRetries: number;
  private worker: Worker<QueueJobData, QueueJobResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private eventHandlers: TaskQueueEventHandler[] = [];

  constructor(options: TaskQueueOptions = {}) {
    this.connection =
      options.connection ?? toConnectionOptions(getRedisConfig());
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const queueName = options.queueName ?? DEFAULT_QUEUE_NAME;
    const dlqName = options.deadLetterQueueName ?? DEFAULT_DLQ_NAME;

    this.queue = new Queue<QueueJobData, QueueJobResult>(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.maxRetries,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: false,
      },
    });

    this.dlq = new Queue<QueueJobData>(dlqName, {
      connection: this.connection,
    });
  }

  async enqueue(
    jobData: QueueJobData,
    options?: { delay?: number; priority?: number; jobId?: string },
  ): Promise<string> {
    const validated = parseJobData(jobData);

    const job = await this.queue.add(validated.taskName, validated, {
      delay: options?.delay,
      priority: options?.priority,
      jobId: options?.jobId,
    });

    this.emit({
      type: "job:added",
      jobId: job.id ?? "",
      data: validated,
      timestamp: new Date(),
    });

    return job.id ?? "";
  }

  process(
    handler: (data: QueueJobData) => Promise<QueueJobResult>,
    concurrency = 1,
  ): void {
    if (this.worker) {
      throw new Error("Queue is already being processed");
    }

    const processor: Processor<QueueJobData, QueueJobResult> = async (
      job: Job<QueueJobData, QueueJobResult>,
    ) => {
      const validated = parseJobData(job.data);

      this.emit({
        type: "job:active",
        jobId: job.id ?? "",
        data: validated,
        timestamp: new Date(),
      });

      return handler(validated);
    };

    this.worker = new Worker<QueueJobData, QueueJobResult>(
      this.queue.name,
      processor,
      {
        connection: this.connection,
        concurrency,
      },
    );

    this.worker.on("completed", (job: Job<QueueJobData, QueueJobResult>) => {
      this.emit({
        type: "job:completed",
        jobId: job.id ?? "",
        data: job.data,
        result: job.returnvalue,
        timestamp: new Date(),
      });
    });

    this.worker.on(
      "failed",
      (job: Job<QueueJobData, QueueJobResult> | undefined, error: Error) => {
        const jobId = job?.id ?? "unknown";
        const attemptsMade = job?.attemptsMade ?? 0;

        this.emit({
          type: "job:failed",
          jobId,
          data: job?.data,
          error: error.message,
          timestamp: new Date(),
        });

        if (attemptsMade >= this.maxRetries && job?.data) {
          void this.moveToDlq(jobId, job.data, error.message);
        }
      },
    );

    this.worker.on("stalled", (jobId: string) => {
      this.emit({
        type: "job:stalled",
        jobId,
        timestamp: new Date(),
      });
    });
  }

  async getStatus(): Promise<TaskQueueStatus> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getJob(
    jobId: string,
  ): Promise<Job<QueueJobData, QueueJobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  onEvent(handler: TaskQueueEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  async close(): Promise<void> {
    await Promise.all([
      this.worker?.close(),
      this.queueEvents?.close(),
      this.queue.close(),
      this.dlq.close(),
    ]);
    this.worker = null;
    this.queueEvents = null;
    this.eventHandlers = [];
  }

  private async moveToDlq(
    jobId: string,
    data: QueueJobData,
    error: string,
  ): Promise<void> {
    await this.dlq.add(`dlq:${data.taskName}`, data, {
      jobId: `dlq:${jobId}`,
    });

    this.emit({
      type: "job:moved-to-dlq",
      jobId,
      data,
      error,
      timestamp: new Date(),
    });
  }

  private emit(event: TaskQueueEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}
