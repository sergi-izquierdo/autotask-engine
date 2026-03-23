import { z } from "zod";

export const TaskResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type TaskResult = z.infer<typeof TaskResultSchema>;
