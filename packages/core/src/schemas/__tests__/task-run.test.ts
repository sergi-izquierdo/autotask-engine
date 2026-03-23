import { describe, expect, it } from "vitest";
import { TaskRunSchema, parseTaskRun } from "../task-run.js";
import { ZodError } from "zod";

const validTaskRun = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  taskId: "660e8400-e29b-41d4-a716-446655440000",
  status: "running" as const,
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("TaskRunSchema", () => {
  it("parses a valid task run", () => {
    const result = TaskRunSchema.parse(validTaskRun);
    expect(result.id).toBe(validTaskRun.id);
    expect(result.taskId).toBe(validTaskRun.taskId);
    expect(result.status).toBe("running");
    expect(result.startedAt).toBeInstanceOf(Date);
  });

  it("defaults status to pending", () => {
    const result = TaskRunSchema.parse({ ...validTaskRun, status: undefined });
    expect(result.status).toBe("pending");
  });

  it("allows optional fields to be omitted", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      taskId: "660e8400-e29b-41d4-a716-446655440000",
    };
    const result = TaskRunSchema.parse(minimal);
    expect(result.startedAt).toBeUndefined();
    expect(result.finishedAt).toBeUndefined();
    expect(result.result).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("parses a completed task run with result", () => {
    const completed = {
      ...validTaskRun,
      status: "success" as const,
      finishedAt: "2026-01-01T00:01:00.000Z",
      result: { success: true, data: { count: 42 } },
    };
    const result = TaskRunSchema.parse(completed);
    expect(result.status).toBe("success");
    expect(result.finishedAt).toBeInstanceOf(Date);
    expect(result.result?.success).toBe(true);
  });

  it("parses a failed task run with error", () => {
    const failed = {
      ...validTaskRun,
      status: "failed" as const,
      finishedAt: "2026-01-01T00:01:00.000Z",
      result: { success: false, error: "Something went wrong" },
      error: "Something went wrong",
    };
    const result = TaskRunSchema.parse(failed);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Something went wrong");
  });

  it("rejects invalid uuid for id", () => {
    expect(() => TaskRunSchema.parse({ ...validTaskRun, id: "bad" })).toThrow(ZodError);
  });

  it("rejects invalid status", () => {
    expect(() => TaskRunSchema.parse({ ...validTaskRun, status: "cancelled" })).toThrow(ZodError);
  });
});

describe("parseTaskRun", () => {
  it("returns a valid TaskRun", () => {
    const result = parseTaskRun(validTaskRun);
    expect(result.id).toBe(validTaskRun.id);
  });

  it("throws ZodError for invalid input", () => {
    expect(() => parseTaskRun({})).toThrow(ZodError);
  });
});
