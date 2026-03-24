import { eq } from "drizzle-orm";
import { tasks, taskRuns } from "./schema.js";
import type { AppDatabase } from "./connection.js";
import type { NewTaskRow, NewTaskRunRow } from "./schema.js";

// ── Task queries ──────────────────────────────────────────────

export function insertTask(db: AppDatabase, task: NewTaskRow) {
  return db.insert(tasks).values(task).returning().get();
}

export function getTaskById(db: AppDatabase, id: string) {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function listTasks(db: AppDatabase) {
  return db.select().from(tasks).all();
}

export function updateTask(
  db: AppDatabase,
  id: string,
  data: Partial<Omit<NewTaskRow, "id">>,
) {
  return db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
}

export function deleteTask(db: AppDatabase, id: string) {
  return db.delete(tasks).where(eq(tasks.id, id)).returning().get();
}

// ── TaskRun queries ───────────────────────────────────────────

export function insertTaskRun(db: AppDatabase, run: NewTaskRunRow) {
  return db.insert(taskRuns).values(run).returning().get();
}

export function getTaskRunById(db: AppDatabase, id: string) {
  return db.select().from(taskRuns).where(eq(taskRuns.id, id)).get();
}

export function listTaskRunsByTaskId(db: AppDatabase, taskId: string) {
  return db
    .select()
    .from(taskRuns)
    .where(eq(taskRuns.taskId, taskId))
    .all();
}

export function updateTaskRun(
  db: AppDatabase,
  id: string,
  data: Partial<Omit<NewTaskRunRow, "id">>,
) {
  return db
    .update(taskRuns)
    .set(data)
    .where(eq(taskRuns.id, id))
    .returning()
    .get();
}
