import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  schedule: text("schedule").notNull(),
  handler: text("handler").notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status", { enum: ["active", "inactive", "archived"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const taskRuns = sqliteTable("task_runs", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  status: text("status", { enum: ["pending", "running", "success", "failed"] })
    .notNull()
    .default("pending"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  result: text("result", { mode: "json" }).$type<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>(),
  error: text("error"),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type TaskRunRow = typeof taskRuns.$inferSelect;
export type NewTaskRunRow = typeof taskRuns.$inferInsert;
