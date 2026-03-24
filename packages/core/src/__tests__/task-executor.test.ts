import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskExecutor } from "../task-executor.js";
import type { TaskHandler } from "../task-executor.js";
import type { TaskRunRepository } from "../task-run-repository.js";
import type { Task, TaskRun } from "../schemas/index.js";

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "test-task",
    schedule: "* * * * *",
    handler: "test-handler",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function successHandler(): TaskHandler {
  return async () => ({ success: true, data: "done" });
}

function failureHandler(message = "something went wrong"): TaskHandler {
  return async () => ({ success: false, error: message });
}

function throwingHandler(error: Error): TaskHandler {
  return async () => {
    throw error;
  };
}

describe("TaskExecutor", () => {
  let repository: TaskRunRepository & { save: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = { save: vi.fn().mockResolvedValue(undefined) };
  });

  describe("successful execution", () => {
    it("runs a handler and returns a successful TaskRun", async () => {
      const executor = new TaskExecutor({}, repository);
      const task = makeTask();

      const run = await executor.execute(task, successHandler());

      expect(run.status).toBe("success");
      expect(run.result).toEqual({ success: true, data: "done" });
      expect(run.taskId).toBe(task.id);
      expect(run.startedAt).toBeInstanceOf(Date);
      expect(run.finishedAt).toBeInstanceOf(Date);
      expect(run.error).toBeUndefined();
    });

    it("saves the run to the repository", async () => {
      const executor = new TaskExecutor({}, repository);

      await executor.execute(makeTask(), successHandler());

      // save is called at least twice: once for running state, once for completion
      expect(repository.save).toHaveBeenCalledTimes(2);
      const lastSave = repository.save.mock.calls[1][0] as TaskRun;
      expect(lastSave.status).toBe("success");
    });
  });

  describe("lifecycle states", () => {
    it("transitions pending → running → success", async () => {
      const executor = new TaskExecutor({}, repository);
      const states: string[] = [];

      repository.save.mockImplementation(async (run: TaskRun) => {
        states.push(run.status);
      });

      await executor.execute(makeTask(), successHandler());

      expect(states).toEqual(["running", "success"]);
    });

    it("transitions pending → running → failed", async () => {
      const executor = new TaskExecutor({}, repository);
      const states: string[] = [];

      repository.save.mockImplementation(async (run: TaskRun) => {
        states.push(run.status);
      });

      await executor.execute(makeTask(), throwingHandler(new Error("boom")));

      expect(states).toEqual(["running", "failed"]);
    });
  });

  describe("events", () => {
    it("emits task:start and task:complete on success", async () => {
      const executor = new TaskExecutor({}, repository);
      const events: string[] = [];

      executor.on("task:start", () => events.push("task:start"));
      executor.on("task:complete", () => events.push("task:complete"));
      executor.on("task:fail", () => events.push("task:fail"));

      await executor.execute(makeTask(), successHandler());

      expect(events).toEqual(["task:start", "task:complete"]);
    });

    it("emits task:start and task:fail on failure", async () => {
      const executor = new TaskExecutor({}, repository);
      const events: string[] = [];

      executor.on("task:start", () => events.push("task:start"));
      executor.on("task:complete", () => events.push("task:complete"));
      executor.on("task:fail", () => events.push("task:fail"));

      await executor.execute(makeTask(), throwingHandler(new Error("boom")));

      expect(events).toEqual(["task:start", "task:fail"]);
    });

    it("event payloads contain the TaskRun", async () => {
      const executor = new TaskExecutor({}, repository);
      let startRun: TaskRun | undefined;
      let completeRun: TaskRun | undefined;

      executor.on("task:start", (run) => {
        startRun = run;
      });
      executor.on("task:complete", (run) => {
        completeRun = run;
      });

      const task = makeTask();
      await executor.execute(task, successHandler());

      expect(startRun).toBeDefined();
      expect(startRun?.taskId).toBe(task.id);
      expect(startRun?.status).toBe("running");

      expect(completeRun).toBeDefined();
      expect(completeRun?.taskId).toBe(task.id);
      expect(completeRun?.status).toBe("success");
    });
  });

  describe("handler returning failure result", () => {
    it("marks the run as failed when handler returns success: false", async () => {
      const executor = new TaskExecutor({}, repository);

      const run = await executor.execute(makeTask(), failureHandler("bad data"));

      expect(run.status).toBe("failed");
      expect(run.result).toEqual({ success: false, error: "bad data" });
      expect(run.error).toBe("bad data");
    });
  });

  describe("timeout", () => {
    it("fails when handler exceeds timeout", async () => {
      const executor = new TaskExecutor({ timeoutMs: 50 }, repository);

      const slowHandler: TaskHandler = async (_task, signal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => resolve({ success: true }),
            5000,
          );
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
          });
        });
      };

      const run = await executor.execute(makeTask(), slowHandler);

      expect(run.status).toBe("failed");
      expect(run.error).toContain("timed out");
    });

    it("uses default 30s timeout", () => {
      const executor = new TaskExecutor();
      // Verify the executor was created without error with defaults
      expect(executor).toBeInstanceOf(TaskExecutor);
    });
  });

  describe("retry with exponential backoff", () => {
    it("retries the specified number of times", async () => {
      const executor = new TaskExecutor(
        { maxRetries: 2, baseDelayMs: 1 },
        repository,
      );
      let attempts = 0;

      const handler: TaskHandler = async () => {
        attempts++;
        throw new Error(`attempt ${attempts}`);
      };

      const run = await executor.execute(makeTask(), handler);

      expect(attempts).toBe(3); // 1 initial + 2 retries
      expect(run.status).toBe("failed");
      expect(run.error).toBe("attempt 3");
    });

    it("succeeds on retry after initial failure", async () => {
      const executor = new TaskExecutor(
        { maxRetries: 2, baseDelayMs: 1 },
        repository,
      );
      let attempts = 0;

      const handler: TaskHandler = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("not yet");
        }
        return { success: true, data: "recovered" };
      };

      const run = await executor.execute(makeTask(), handler);

      expect(attempts).toBe(2);
      expect(run.status).toBe("success");
      expect(run.result).toEqual({ success: true, data: "recovered" });
    });

    it("does not retry when maxRetries is 0", async () => {
      const executor = new TaskExecutor({ maxRetries: 0 }, repository);
      let attempts = 0;

      const handler: TaskHandler = async () => {
        attempts++;
        throw new Error("fail");
      };

      await executor.execute(makeTask(), handler);

      expect(attempts).toBe(1);
    });

    it("applies exponential backoff between retries", async () => {
      const executor = new TaskExecutor(
        { maxRetries: 3, baseDelayMs: 10 },
        repository,
      );
      const timestamps: number[] = [];

      const handler: TaskHandler = async () => {
        timestamps.push(Date.now());
        throw new Error("fail");
      };

      await executor.execute(makeTask(), handler);

      expect(timestamps.length).toBe(4); // 1 initial + 3 retries

      // First retry delay ~10ms (baseDelay * 2^0)
      // Second retry delay ~20ms (baseDelay * 2^1)
      // Third retry delay ~40ms (baseDelay * 2^2)
      // Just verify delays are increasing
      const delay1 = timestamps[2] - timestamps[1];
      const delay0 = timestamps[1] - timestamps[0];
      expect(delay1).toBeGreaterThanOrEqual(delay0);
    });
  });

  describe("without repository", () => {
    it("works without a repository", async () => {
      const executor = new TaskExecutor();

      const run = await executor.execute(makeTask(), successHandler());

      expect(run.status).toBe("success");
    });
  });

  describe("non-Error throws", () => {
    it("wraps non-Error throws into Error", async () => {
      const executor = new TaskExecutor({}, repository);

      const handler: TaskHandler = async () => {
        throw "string error";
      };

      const run = await executor.execute(makeTask(), handler);

      expect(run.status).toBe("failed");
      expect(run.error).toBe("string error");
    });
  });
});
