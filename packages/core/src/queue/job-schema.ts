import { z } from "zod";

export const QueueJobDataSchema = z.object({
  taskId: z.string().uuid(),
  taskName: z.string().min(1),
  handler: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.coerce.date(),
});

export type QueueJobData = z.infer<typeof QueueJobDataSchema>;

export function parseJobData(data: unknown): QueueJobData {
  return QueueJobDataSchema.parse(data);
}

export const QueueJobResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  completedAt: z.coerce.date(),
});

export type QueueJobResult = z.infer<typeof QueueJobResultSchema>;
