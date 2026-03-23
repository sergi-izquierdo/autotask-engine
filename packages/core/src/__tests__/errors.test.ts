import { describe, expect, it } from "vitest";
import {
  AppError,
  ErrorCode,
  ScheduleError,
  TaskExecutionError,
  TaskNotFoundError,
  ValidationError,
} from "../errors.js";

describe("AppError", () => {
  it("stores code, message, and cause", () => {
    const cause = new Error("root cause");
    const error = new AppError(ErrorCode.VALIDATION_ERROR, "bad input", cause);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe("bad input");
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("AppError");
  });

  it("works without a cause", () => {
    const error = new AppError(ErrorCode.TASK_NOT_FOUND, "missing");
    expect(error.cause).toBeUndefined();
  });
});

describe("TaskNotFoundError", () => {
  it("includes taskId and correct code", () => {
    const error = new TaskNotFoundError("task-42");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.TASK_NOT_FOUND);
    expect(error.taskId).toBe("task-42");
    expect(error.message).toBe("Task not found: task-42");
    expect(error.name).toBe("TaskNotFoundError");
  });

  it("accepts a cause", () => {
    const cause = new Error("db down");
    const error = new TaskNotFoundError("task-1", cause);
    expect(error.cause).toBe(cause);
  });
});

describe("TaskExecutionError", () => {
  it("includes taskId and custom message", () => {
    const error = new TaskExecutionError("task-7", "script crashed");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.TASK_EXECUTION_ERROR);
    expect(error.taskId).toBe("task-7");
    expect(error.message).toBe("script crashed");
    expect(error.name).toBe("TaskExecutionError");
  });
});

describe("ValidationError", () => {
  it("includes optional field", () => {
    const error = new ValidationError("must be positive", "amount");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.field).toBe("amount");
    expect(error.message).toBe("must be positive");
    expect(error.name).toBe("ValidationError");
  });

  it("works without a field", () => {
    const error = new ValidationError("invalid payload");
    expect(error.field).toBeUndefined();
  });
});

describe("ScheduleError", () => {
  it("includes optional expression", () => {
    const error = new ScheduleError("invalid cron", "* * * *");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.SCHEDULE_ERROR);
    expect(error.expression).toBe("* * * *");
    expect(error.message).toBe("invalid cron");
    expect(error.name).toBe("ScheduleError");
  });
});
