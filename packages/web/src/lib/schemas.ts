import { z } from "zod";
import { TaskStatusSchema } from "@autotask/core";
import { isValidCron } from "@/lib/cron";

export const TaskFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  schedule: z.string().min(1, "Cron schedule is required").refine(isValidCron, "Invalid cron expression"),
  handler: z.string().min(1, "Handler is required"),
  config: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    "Config must be valid JSON object",
  ),
  status: TaskStatusSchema.default("active"),
});

export type TaskFormValues = z.infer<typeof TaskFormSchema>;

export function formValuesToPayload(values: TaskFormValues): Record<string, unknown> {
  return {
    name: values.name,
    description: values.description || undefined,
    schedule: values.schedule,
    handler: values.handler,
    config: values.config && values.config.trim() !== "" ? JSON.parse(values.config) : undefined,
    status: values.status,
  };
}
