import { describe, it, expect } from "vitest";
import {
  QueueJobDataSchema,
  parseJobData,
  QueueJobResultSchema,
} from "../job-schema.js";

describe("QueueJobDataSchema", () => {
  const validData = {
    taskId: "550e8400-e29b-41d4-a716-446655440000",
    taskName: "my-task",
    handler: "handlers/my-task",
    scheduledAt: "2025-01-01T00:00:00Z",
  };

  it("validates correct job data", () => {
    const result = QueueJobDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates job data with optional config", () => {
    const result = QueueJobDataSchema.safeParse({
      ...validData,
      config: { key: "value", nested: { a: 1 } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid taskId", () => {
    const result = QueueJobDataSchema.safeParse({
      ...validData,
      taskId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty taskName", () => {
    const result = QueueJobDataSchema.safeParse({
      ...validData,
      taskName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty handler", () => {
    const result = QueueJobDataSchema.safeParse({
      ...validData,
      handler: "",
    });
    expect(result.success).toBe(false);
  });

  it("coerces scheduledAt string to Date", () => {
    const parsed = parseJobData(validData);
    expect(parsed.scheduledAt).toBeInstanceOf(Date);
  });
});

describe("QueueJobResultSchema", () => {
  it("validates success result", () => {
    const result = QueueJobResultSchema.safeParse({
      success: true,
      data: { count: 42 },
      completedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("validates failure result", () => {
    const result = QueueJobResultSchema.safeParse({
      success: false,
      error: "Something went wrong",
      completedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing completedAt", () => {
    const result = QueueJobResultSchema.safeParse({
      success: true,
    });
    expect(result.success).toBe(false);
  });
});
