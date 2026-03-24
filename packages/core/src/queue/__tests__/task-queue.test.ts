import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueueJobData, TaskQueueEvent } from "../index.js";

const mockQueueAdd = vi.fn();
const mockQueueClose = vi.fn();
const mockQueueGetWaitingCount = vi.fn();
const mockQueueGetActiveCount = vi.fn();
const mockQueueGetCompletedCount = vi.fn();
const mockQueueGetFailedCount = vi.fn();
const mockQueueGetDelayedCount = vi.fn();
const mockQueueGetJob = vi.fn();

const mockWorkerOn = vi.fn();
const mockWorkerClose = vi.fn();

vi.mock("bullmq", () => {
  const MockQueue = vi.fn(function (this: Record<string, unknown>, name: string) {
    this.name = name;
    this.add = mockQueueAdd;
    this.close = mockQueueClose;
    this.getWaitingCount = mockQueueGetWaitingCount;
    this.getActiveCount = mockQueueGetActiveCount;
    this.getCompletedCount = mockQueueGetCompletedCount;
    this.getFailedCount = mockQueueGetFailedCount;
    this.getDelayedCount = mockQueueGetDelayedCount;
    this.getJob = mockQueueGetJob;
  });

  const MockWorker = vi.fn(function (this: Record<string, unknown>) {
    this.on = mockWorkerOn;
    this.close = mockWorkerClose;
  });

  const MockQueueEvents = vi.fn(function (this: Record<string, unknown>) {
    this.close = vi.fn();
  });

  return {
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
  };
});

const { TaskQueue } = await import("../task-queue.js");

const validJobData: QueueJobData = {
  taskId: "550e8400-e29b-41d4-a716-446655440000",
  taskName: "test-task",
  handler: "handlers/test",
  scheduledAt: new Date("2025-01-01T00:00:00Z"),
};

describe("TaskQueue", () => {
  let queue: InstanceType<typeof TaskQueue>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new TaskQueue({
      connection: { host: "localhost", port: 6379 },
    });
  });

  describe("enqueue", () => {
    it("adds a job to the queue and returns job id", async () => {
      mockQueueAdd.mockResolvedValue({ id: "job-1" });

      const jobId = await queue.enqueue(validJobData);

      expect(jobId).toBe("job-1");
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "test-task",
        expect.objectContaining({ taskId: validJobData.taskId }),
        expect.objectContaining({}),
      );
    });

    it("passes delay and priority options", async () => {
      mockQueueAdd.mockResolvedValue({ id: "job-2" });

      await queue.enqueue(validJobData, { delay: 5000, priority: 1 });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "test-task",
        expect.anything(),
        expect.objectContaining({ delay: 5000, priority: 1 }),
      );
    });

    it("emits job:added event", async () => {
      mockQueueAdd.mockResolvedValue({ id: "job-3" });
      const events: TaskQueueEvent[] = [];
      queue.onEvent((e) => events.push(e));

      await queue.enqueue(validJobData);

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("job:added");
      expect(events[0]?.jobId).toBe("job-3");
    });

    it("validates job data and rejects invalid input", async () => {
      const invalidData = { ...validJobData, taskId: "not-a-uuid" };
      await expect(
        queue.enqueue(invalidData as QueueJobData),
      ).rejects.toThrow();
    });
  });

  describe("process", () => {
    it("creates a worker to process jobs", async () => {
      const handler = vi.fn();
      queue.process(handler);

      const { Worker } = vi.mocked(await import("bullmq"));
      expect(Worker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ concurrency: 1 }),
      );
    });

    it("throws if process is called twice", () => {
      queue.process(vi.fn());
      expect(() => queue.process(vi.fn())).toThrow(
        "Queue is already being processed",
      );
    });

    it("registers completed, failed, and stalled event handlers on worker", () => {
      queue.process(vi.fn());

      const registeredEvents = mockWorkerOn.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(registeredEvents).toContain("completed");
      expect(registeredEvents).toContain("failed");
      expect(registeredEvents).toContain("stalled");
    });
  });

  describe("getStatus", () => {
    it("returns queue status counts", async () => {
      mockQueueGetWaitingCount.mockResolvedValue(5);
      mockQueueGetActiveCount.mockResolvedValue(2);
      mockQueueGetCompletedCount.mockResolvedValue(100);
      mockQueueGetFailedCount.mockResolvedValue(3);
      mockQueueGetDelayedCount.mockResolvedValue(1);

      const status = await queue.getStatus();

      expect(status).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });

  describe("getJob", () => {
    it("retrieves a job by id", async () => {
      const mockJob = { id: "job-1", data: validJobData };
      mockQueueGetJob.mockResolvedValue(mockJob);

      const job = await queue.getJob("job-1");

      expect(job).toBe(mockJob);
      expect(mockQueueGetJob).toHaveBeenCalledWith("job-1");
    });

    it("returns undefined for non-existent job", async () => {
      mockQueueGetJob.mockResolvedValue(undefined);

      const job = await queue.getJob("non-existent");

      expect(job).toBeUndefined();
    });
  });

  describe("onEvent", () => {
    it("returns an unsubscribe function", async () => {
      mockQueueAdd.mockResolvedValue({ id: "job-1" });
      const events: TaskQueueEvent[] = [];
      const unsubscribe = queue.onEvent((e) => events.push(e));

      await queue.enqueue(validJobData);
      expect(events).toHaveLength(1);

      unsubscribe();
      await queue.enqueue(validJobData);
      expect(events).toHaveLength(1);
    });
  });

  describe("close", () => {
    it("closes queue and dlq", async () => {
      await queue.close();
      expect(mockQueueClose).toHaveBeenCalled();
    });

    it("closes worker if processing", async () => {
      queue.process(vi.fn());
      await queue.close();
      expect(mockWorkerClose).toHaveBeenCalled();
    });
  });

  describe("dead letter queue", () => {
    it("moves job to DLQ after max retries exhausted", async () => {
      const dlqAddSpy = mockQueueAdd;
      const events: TaskQueueEvent[] = [];
      queue.onEvent((e) => events.push(e));

      queue.process(vi.fn());

      // Get the 'failed' handler registered on the worker
      const failedCall = mockWorkerOn.mock.calls.find(
        (c: unknown[]) => c[0] === "failed",
      );

      if (!failedCall) {
        throw new Error("Expected 'failed' handler to be registered");
      }

      const failedHandler = failedCall[1] as (
        job: { id: string; data: QueueJobData; attemptsMade: number } | undefined,
        error: Error,
      ) => void;

      // Simulate a job that has exceeded max retries (default 3)
      dlqAddSpy.mockResolvedValue({ id: "dlq:job-1" });
      failedHandler(
        { id: "job-1", data: validJobData, attemptsMade: 3 },
        new Error("task failed"),
      );

      // Allow async moveToDlq to complete
      await vi.waitFor(() => {
        expect(events.some((e) => e.type === "job:moved-to-dlq")).toBe(true);
      });

      const dlqEvent = events.find((e) => e.type === "job:moved-to-dlq");
      expect(dlqEvent?.jobId).toBe("job-1");
      expect(dlqEvent?.error).toBe("task failed");
    });

    it("does not move to DLQ if retries remain", () => {
      const events: TaskQueueEvent[] = [];
      queue.onEvent((e) => events.push(e));

      queue.process(vi.fn());

      const failedCall = mockWorkerOn.mock.calls.find(
        (c: unknown[]) => c[0] === "failed",
      );

      if (!failedCall) {
        throw new Error("Expected 'failed' handler to be registered");
      }

      const failedHandler = failedCall[1] as (
        job: { id: string; data: QueueJobData; attemptsMade: number } | undefined,
        error: Error,
      ) => void;

      failedHandler(
        { id: "job-1", data: validJobData, attemptsMade: 1 },
        new Error("temporary failure"),
      );

      expect(events.some((e) => e.type === "job:moved-to-dlq")).toBe(false);
    });
  });
});
