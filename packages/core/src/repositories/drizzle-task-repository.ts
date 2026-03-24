import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { tasks } from "../db/index.js";
import type { Task, TaskStatus } from "../schemas/index.js";
import type {
  TaskRepository,
  CreateTaskInput,
  UpdateTaskInput,
} from "./task-repository.js";

function rowToTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    schedule: row.schedule,
    handler: row.handler,
    config: row.config ? (JSON.parse(row.config) as Record<string, unknown>) : undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: DrizzleDB) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date();
    const row = {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      schedule: input.schedule,
      handler: input.handler,
      config: input.config ? JSON.stringify(input.config) : null,
      status: input.status ?? ("active" as const),
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(tasks).values(row).run();

    return rowToTask({ ...row, description: row.description, config: row.config });
  }

  async getById(id: string): Promise<Task | null> {
    const rows = this.db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (rows.length === 0) return null;
    return rowToTask(rows[0]);
  }

  async getAll(): Promise<Task[]> {
    const rows = this.db.select().from(tasks).all();
    return rows.map(rowToTask);
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.schedule !== undefined) updates.schedule = input.schedule;
    if (input.handler !== undefined) updates.handler = input.handler;
    if (input.config !== undefined)
      updates.config = JSON.stringify(input.config);
    if (input.status !== undefined) updates.status = input.status;

    this.db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.delete(tasks).where(eq(tasks.id, id)).run();
    return result.changes > 0;
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    const rows = this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, status))
      .all();
    return rows.map(rowToTask);
  }
}
