import { z } from "zod";
import { TaskResultSchema } from "./task-result.js";

export const TaskRunStatusSchema = z.enum(["pending", "running", "success", "failed"]);

export type TaskRunStatus = z.infer<typeof TaskRunStatusSchema>;

export const TaskRunSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  status: TaskRunStatusSchema.default("pending"),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  result: TaskResultSchema.optional(),
  error: z.string().optional(),
});

export type TaskRun = z.infer<typeof TaskRunSchema>;

export function parseTaskRun(data: unknown): TaskRun {
  return TaskRunSchema.parse(data);
}
