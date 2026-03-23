import { describe, expect, it } from "vitest";
import { TaskSchema, parseTask } from "../task.js";
import { ZodError } from "zod";

const validTask = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "My Task",
  description: "A test task",
  schedule: "*/5 * * * *",
  handler: "handlers/my-task",
  config: { retries: 3 },
  status: "active" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("TaskSchema", () => {
  it("parses a valid task", () => {
    const result = TaskSchema.parse(validTask);
    expect(result.id).toBe(validTask.id);
    expect(result.name).toBe("My Task");
    expect(result.status).toBe("active");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults status to active", () => {
    const result = TaskSchema.parse({ ...validTask, status: undefined });
    expect(result.status).toBe("active");
  });

  it("allows optional fields to be omitted", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Minimal Task",
      schedule: "0 * * * *",
      handler: "handlers/minimal",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = TaskSchema.parse(minimal);
    expect(result.description).toBeUndefined();
    expect(result.config).toBeUndefined();
  });

  it("rejects invalid uuid for id", () => {
    expect(() => TaskSchema.parse({ ...validTask, id: "not-a-uuid" })).toThrow(ZodError);
  });

  it("rejects empty name", () => {
    expect(() => TaskSchema.parse({ ...validTask, name: "" })).toThrow(ZodError);
  });

  it("rejects invalid status", () => {
    expect(() => TaskSchema.parse({ ...validTask, status: "unknown" })).toThrow(ZodError);
  });

  it("coerces string dates to Date objects", () => {
    const result = TaskSchema.parse(validTask);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe("parseTask", () => {
  it("returns a valid Task", () => {
    const result = parseTask(validTask);
    expect(result.id).toBe(validTask.id);
  });

  it("throws ZodError for invalid input", () => {
    expect(() => parseTask({})).toThrow(ZodError);
  });
});
