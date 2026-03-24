import { Hono } from "hono";
import { z } from "zod";
import {
  TaskSchema,
  TaskStatusSchema,
  TaskRunSchema,
  ValidationError,
  TaskNotFoundError,
} from "@autotask/core";
import { TaskStore } from "../store/task-store.js";

const CreateTaskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  schedule: z.string().min(1, "Schedule is required"),
  handler: z.string().min(1, "Handler is required"),
  config: z.record(z.string(), z.unknown()).optional(),
  status: TaskStatusSchema.optional(),
});

const UpdateTaskSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  schedule: z.string().min(1).optional(),
  handler: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: TaskStatusSchema.optional(),
});

const ListQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function createTaskRoutes(store: TaskStore) {
  const tasks = new Hono();

  // POST /api/tasks - Create task
  tasks.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }

    const now = new Date();
    const task = TaskSchema.parse({
      id: crypto.randomUUID(),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    });

    store.create(task);
    return c.json(task, 201);
  });

  // GET /api/tasks - List tasks
  tasks.get("/", (c) => {
    const query = ListQuerySchema.safeParse({
      status: c.req.query("status"),
      page: c.req.query("page"),
      limit: c.req.query("limit"),
    });

    if (!query.success) {
      throw new ValidationError(
        query.error.issues.map((i) => i.message).join(", "),
      );
    }

    const result = store.list(query.data);
    return c.json(result);
  });

  // GET /api/tasks/:id - Get task by ID
  tasks.get("/:id", (c) => {
    const id = c.req.param("id");
    const task = store.getById(id);

    if (!task) {
      throw new TaskNotFoundError(id);
    }

    return c.json(task);
  });

  // PUT /api/tasks/:id - Update task
  tasks.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }

    const updated = store.update(id, parsed.data);

    if (!updated) {
      throw new TaskNotFoundError(id);
    }

    return c.json(updated);
  });

  // DELETE /api/tasks/:id - Delete task
  tasks.delete("/:id", (c) => {
    const id = c.req.param("id");
    const existed = store.delete(id);

    if (!existed) {
      throw new TaskNotFoundError(id);
    }

    return c.json({ success: true }, 200);
  });

  // POST /api/tasks/:id/run - Trigger immediate execution
  tasks.post("/:id/run", (c) => {
    const id = c.req.param("id");
    const task = store.getById(id);

    if (!task) {
      throw new TaskNotFoundError(id);
    }

    const now = new Date();
    const taskRun = TaskRunSchema.parse({
      id: crypto.randomUUID(),
      taskId: task.id,
      status: "pending",
      startedAt: now,
    });

    return c.json(taskRun, 202);
  });

  return tasks;
}
