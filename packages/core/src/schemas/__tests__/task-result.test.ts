import { describe, expect, it } from "vitest";
import { TaskResultSchema } from "../task-result.js";
import { ZodError } from "zod";

describe("TaskResultSchema", () => {
  it("parses a successful result", () => {
    const result = TaskResultSchema.parse({ success: true, data: { count: 42 } });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 42 });
  });

  it("parses a failed result with error", () => {
    const result = TaskResultSchema.parse({ success: false, error: "Something failed" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Something failed");
  });

  it("allows data to be any type", () => {
    expect(TaskResultSchema.parse({ success: true, data: "string" }).data).toBe("string");
    expect(TaskResultSchema.parse({ success: true, data: 123 }).data).toBe(123);
    expect(TaskResultSchema.parse({ success: true, data: [1, 2] }).data).toEqual([1, 2]);
    expect(TaskResultSchema.parse({ success: true, data: null }).data).toBeNull();
  });

  it("allows optional fields to be omitted", () => {
    const result = TaskResultSchema.parse({ success: true });
    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("rejects missing success field", () => {
    expect(() => TaskResultSchema.parse({})).toThrow(ZodError);
  });

  it("rejects non-boolean success", () => {
    expect(() => TaskResultSchema.parse({ success: "yes" })).toThrow(ZodError);
  });
});
