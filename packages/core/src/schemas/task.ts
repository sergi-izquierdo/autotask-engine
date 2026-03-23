import { z } from "zod";

export const TaskStatusSchema = z.enum(["active", "inactive", "archived"]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  schedule: z.string().min(1),
  handler: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
  status: TaskStatusSchema.default("active"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export function parseTask(data: unknown): Task {
  return TaskSchema.parse(data);
}
