import { describe, it, expect } from "vitest";
import { TaskFormSchema, formValuesToPayload } from "@/lib/schemas";

describe("TaskFormSchema", () => {
  const validValues = {
    name: "Test Task",
    description: "A test task",
    schedule: "*/5 * * * *",
    handler: "test-handler",
    config: '{"key": "value"}',
    status: "active" as const,
  };

  it("validates correct form values", () => {
    const result = TaskFormSchema.safeParse(validValues);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires handler", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, handler: "" });
    expect(result.success).toBe(false);
  });

  it("requires schedule", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, schedule: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid cron expressions", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, schedule: "not valid" });
    expect(result.success).toBe(false);
  });

  it("allows empty description", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, description: "" });
    expect(result.success).toBe(true);
  });

  it("allows empty config", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, config: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid JSON config", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, config: "not json" });
    expect(result.success).toBe(false);
  });

  it("rejects non-object JSON config", () => {
    const result = TaskFormSchema.safeParse({ ...validValues, config: "[1,2,3]" });
    expect(result.success).toBe(false);
  });

  it("defaults status to active", () => {
    const { name, description, schedule, handler, config } = validValues;
    const result = TaskFormSchema.safeParse({ name, description, schedule, handler, config });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });
});

describe("formValuesToPayload", () => {
  it("converts form values to API payload", () => {
    const values = {
      name: "My Task",
      description: "A description",
      schedule: "0 * * * *",
      handler: "my-handler",
      config: '{"url": "https://example.com"}',
      status: "active" as const,
    };

    const payload = formValuesToPayload(values);
    expect(payload).toEqual({
      name: "My Task",
      description: "A description",
      schedule: "0 * * * *",
      handler: "my-handler",
      config: { url: "https://example.com" },
      status: "active",
    });
  });

  it("omits empty optional fields", () => {
    const values = {
      name: "My Task",
      description: "",
      schedule: "0 * * * *",
      handler: "my-handler",
      config: "",
      status: "active" as const,
    };

    const payload = formValuesToPayload(values);
    expect(payload.description).toBeUndefined();
    expect(payload.config).toBeUndefined();
  });
});
