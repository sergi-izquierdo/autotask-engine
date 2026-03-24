import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../scheduler.js";
import { InMemoryTaskStore } from "../task-store.js";
import type { TaskDispatcher } from "../dispatcher.js";
import type { Task } from "@autotask/core";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    name: "Test Task",
    schedule: "* * * * *",
    handler: "handlers/test",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockDispatcher(): TaskDispatcher {
  return {
    dispatch: vi.fn<(task: Task) => Promise<string>>().mockResolvedValue("job-1"),
    close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

const silentLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads tasks on start and registers them", async () => {
    const store = new InMemoryTaskStore();
    const task = makeTask();
    store.setTasks([task]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 60_000,
      logger: silentLogger,
    });

    await scheduler.start();

    expect(scheduler.cronManager.getScheduledTaskIds()).toEqual(["task-1"]);
    expect(scheduler.isRunning()).toBe(true);

    await scheduler.stop();
  });

  it("dispatches job when cron fires", async () => {
    const store = new InMemoryTaskStore();
    const task = makeTask();
    store.setTasks([task]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 300_000,
      logger: silentLogger,
    });

    await scheduler.start();

    // Advance past next minute boundary to trigger cron
    vi.advanceTimersByTime(61_000);

    // Allow the dispatch promise to resolve
    await vi.advanceTimersByTimeAsync(0);

    expect(dispatcher.dispatch).toHaveBeenCalledWith(task);

    await scheduler.stop();
  });

  it("polls for task changes at configured interval", async () => {
    const store = new InMemoryTaskStore();
    store.setTasks([]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 10_000,
      logger: silentLogger,
    });

    await scheduler.start();
    expect(scheduler.cronManager.getScheduledTaskIds()).toHaveLength(0);

    // Add a task and advance to next poll
    store.setTasks([makeTask()]);
    vi.advanceTimersByTime(10_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(scheduler.cronManager.getScheduledTaskIds()).toEqual(["task-1"]);

    await scheduler.stop();
  });

  it("handles schedule updates (re-registers cron)", async () => {
    const store = new InMemoryTaskStore();
    const task = makeTask({ schedule: "* * * * *" });
    store.setTasks([task]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 10_000,
      logger: silentLogger,
    });

    await scheduler.start();

    const nextRun1 = scheduler.cronManager.getNextRunTime("task-1");

    // Update the schedule
    const updatedTask = makeTask({ schedule: "0 * * * *" });
    store.setTasks([updatedTask]);
    vi.advanceTimersByTime(10_000);
    await vi.advanceTimersByTimeAsync(0);

    const nextRun2 = scheduler.cronManager.getNextRunTime("task-1");
    expect(nextRun2).not.toEqual(nextRun1);

    await scheduler.stop();
  });

  it("graceful shutdown stops everything", async () => {
    const store = new InMemoryTaskStore();
    store.setTasks([makeTask()]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 60_000,
      logger: silentLogger,
    });

    await scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    await scheduler.stop();

    expect(scheduler.isRunning()).toBe(false);
    expect(scheduler.cronManager.getScheduledTaskIds()).toHaveLength(0);
    expect(dispatcher.close).toHaveBeenCalled();
  });

  it("does not start twice", async () => {
    const store = new InMemoryTaskStore();
    store.setTasks([]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 60_000,
      logger: silentLogger,
    });

    await scheduler.start();
    await scheduler.start(); // second call is no-op

    expect(scheduler.isRunning()).toBe(true);

    await scheduler.stop();
  });

  it("filters out inactive tasks", async () => {
    const store = new InMemoryTaskStore();
    store.setTasks([
      makeTask({ id: "active-1", status: "active" }),
      makeTask({ id: "inactive-1", status: "inactive" }),
      makeTask({ id: "archived-1", status: "archived" }),
    ]);

    const dispatcher = createMockDispatcher();
    const scheduler = new Scheduler({
      taskStore: store,
      dispatcher,
      pollIntervalMs: 60_000,
      logger: silentLogger,
    });

    await scheduler.start();

    expect(scheduler.cronManager.getScheduledTaskIds()).toEqual(["active-1"]);

    await scheduler.stop();
  });
});
