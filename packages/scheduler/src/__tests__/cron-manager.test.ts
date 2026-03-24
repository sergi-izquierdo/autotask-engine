import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CronManager } from "../cron-manager.js";
import { ScheduleError } from "@autotask/core";
import type { Task } from "@autotask/core";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-id-1",
    name: "Test Task",
    schedule: "*/5 * * * *", // every 5 minutes
    handler: "handlers/test",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CronManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers a task and fires on schedule", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask({ schedule: "* * * * *" }); // every minute
    manager.register(task);

    expect(manager.getScheduledTaskIds()).toEqual(["test-id-1"]);

    // Advance past the next minute boundary
    vi.advanceTimersByTime(61_000);

    expect(onTick).toHaveBeenCalledWith(task);

    manager.stopAll();
  });

  it("re-arms timer after firing", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask({ schedule: "* * * * *" });
    manager.register(task);

    // Fire twice
    vi.advanceTimersByTime(61_000);
    vi.advanceTimersByTime(61_000);

    expect(onTick).toHaveBeenCalledTimes(2);

    manager.stopAll();
  });

  it("unregisters a task", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask();
    manager.register(task);
    expect(manager.getScheduledTaskIds()).toHaveLength(1);

    manager.unregister(task.id);
    expect(manager.getScheduledTaskIds()).toHaveLength(0);

    vi.advanceTimersByTime(600_000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("replaces timer when re-registering with new schedule", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask({ schedule: "* * * * *" });
    manager.register(task);

    // Re-register with less frequent schedule
    const updated = makeTask({ schedule: "0 * * * *" }); // every hour
    manager.register(updated);

    // Only one task registered
    expect(manager.getScheduledTaskIds()).toHaveLength(1);

    manager.stopAll();
  });

  it("throws ScheduleError for invalid cron expression", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask({ schedule: "invalid-cron" });

    expect(() => manager.register(task)).toThrow(ScheduleError);

    manager.stopAll();
  });

  it("sync adds new tasks and removes missing ones", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task1 = makeTask({ id: "t1", schedule: "* * * * *" });
    const task2 = makeTask({ id: "t2", schedule: "*/5 * * * *" });

    manager.sync([task1, task2]);
    expect(manager.getScheduledTaskIds().sort()).toEqual(["t1", "t2"]);

    // Remove task1, keep task2
    manager.sync([task2]);
    expect(manager.getScheduledTaskIds()).toEqual(["t2"]);

    manager.stopAll();
  });

  it("sync updates tasks with changed schedules", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    const task = makeTask({ id: "t1", schedule: "* * * * *" });
    manager.sync([task]);

    const nextRun1 = manager.getNextRunTime("t1");

    const updated = makeTask({ id: "t1", schedule: "0 * * * *" });
    manager.sync([updated]);

    const nextRun2 = manager.getNextRunTime("t1");
    expect(nextRun2).not.toEqual(nextRun1);

    manager.stopAll();
  });

  it("stopAll clears all timers", () => {
    const onTick = vi.fn();
    const manager = new CronManager({ onTick });

    manager.register(makeTask({ id: "t1", schedule: "* * * * *" }));
    manager.register(makeTask({ id: "t2", schedule: "*/5 * * * *" }));

    manager.stopAll();
    expect(manager.getScheduledTaskIds()).toHaveLength(0);

    vi.advanceTimersByTime(600_000);
    expect(onTick).not.toHaveBeenCalled();
  });
});
