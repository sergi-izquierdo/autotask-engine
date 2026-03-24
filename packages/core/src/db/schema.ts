import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  schedule: text("schedule").notNull(),
  handler: text("handler").notNull(),
  config: text("config"),
  status: text("status", { enum: ["active", "inactive", "archived"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const taskRuns = sqliteTable("task_runs", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  status: text("status", {
    enum: ["pending", "running", "success", "failed"],
  })
    .notNull()
    .default("pending"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  result: text("result"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
