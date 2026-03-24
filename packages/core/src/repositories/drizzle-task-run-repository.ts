import { eq, desc, sql } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { taskRuns } from "../db/index.js";
import type { TaskRun, TaskResult } from "../schemas/index.js";
import type {
  TaskRunRepository,
  CreateTaskRunInput,
  UpdateTaskRunStatusInput,
} from "./task-run-repository.js";

function rowToTaskRun(row: typeof taskRuns.$inferSelect): TaskRun {
  return {
    id: row.id,
    taskId: row.taskId,
    status: row.status,
    startedAt: row.startedAt ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
    result: row.result
      ? (JSON.parse(row.result) as TaskResult)
      : undefined,
    error: row.error ?? undefined,
  };
}

export class DrizzleTaskRunRepository implements TaskRunRepository {
  constructor(private readonly db: DrizzleDB) {}

  async create(input: CreateTaskRunInput): Promise<TaskRun> {
    const row = {
      id: input.id,
      taskId: input.taskId,
      status: input.status ?? ("pending" as const),
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null,
      createdAt: new Date(),
    };

    this.db.insert(taskRuns).values(row).run();

    return rowToTaskRun({ ...row });
  }

  async getByTaskId(taskId: string): Promise<TaskRun[]> {
    const rows = this.db
      .select()
      .from(taskRuns)
      .where(eq(taskRuns.taskId, taskId))
      .all();
    return rows.map(rowToTaskRun);
  }

  async getLatest(taskId: string): Promise<TaskRun | null> {
    const rows = this.db
      .select()
      .from(taskRuns)
      .where(eq(taskRuns.taskId, taskId))
      .orderBy(desc(sql`rowid`))
      .limit(1)
      .all();
    if (rows.length === 0) return null;
    return rowToTaskRun(rows[0]);
  }

  async updateStatus(
    id: string,
    input: UpdateTaskRunStatusInput,
  ): Promise<TaskRun | null> {
    const rows = this.db
      .select()
      .from(taskRuns)
      .where(eq(taskRuns.id, id))
      .all();
    if (rows.length === 0) return null;

    const updates: Record<string, unknown> = { status: input.status };
    if (input.startedAt !== undefined) updates.startedAt = input.startedAt;
    if (input.finishedAt !== undefined) updates.finishedAt = input.finishedAt;
    if (input.result !== undefined)
      updates.result = JSON.stringify(input.result);
    if (input.error !== undefined) updates.error = input.error;

    this.db.update(taskRuns).set(updates).where(eq(taskRuns.id, id)).run();

    const updated = this.db
      .select()
      .from(taskRuns)
      .where(eq(taskRuns.id, id))
      .all();
    return rowToTaskRun(updated[0]);
  }
}
