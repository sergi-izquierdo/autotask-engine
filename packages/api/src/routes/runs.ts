import { Hono } from "hono";
import {
  TaskNotFoundError,
  RunNotFoundError,
  ValidationError,
} from "@autotask/core";
import type { RunStore } from "../store/run-store.js";

function computeDuration(run: { startedAt?: Date; finishedAt?: Date }): number | null {
  if (run.startedAt && run.finishedAt) {
    return run.finishedAt.getTime() - run.startedAt.getTime();
  }
  return null;
}

function formatRun(run: {
  id: string;
  taskId: string;
  status: string;
  startedAt?: Date;
  finishedAt?: Date;
  result?: { success: boolean; data?: unknown; error?: string };
  error?: string;
}) {
  return {
    id: run.id,
    taskId: run.taskId,
    status: run.status,
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    durationMs: computeDuration(run),
    result: run.result ?? null,
    error: run.error ?? null,
  };
}

export function createRunRoutes(store: RunStore) {
  const app = new Hono();

  // GET /api/tasks/:id/runs - List runs for a task (paginated)
  app.get("/api/tasks/:id/runs", (c) => {
    const taskId = c.req.param("id");
    const task = store.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    const page = parseInt(c.req.query("page") ?? "1", 10);
    const limit = parseInt(c.req.query("limit") ?? "20", 10);

    if (isNaN(page) || page < 1) {
      throw new ValidationError("page must be a positive integer", "page");
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("limit must be between 1 and 100", "limit");
    }

    const runs = store
      .getRunsByTaskId(taskId)
      .sort((a, b) => {
        const aTime = a.startedAt?.getTime() ?? 0;
        const bTime = b.startedAt?.getTime() ?? 0;
        return bTime - aTime;
      });

    const total = runs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = runs.slice(offset, offset + limit);

    return c.json({
      data: paginated.map(formatRun),
      pagination: { page, limit, total, totalPages },
    });
  });

  // GET /api/runs/latest - Latest runs across all tasks
  app.get("/api/runs/latest", (c) => {
    const limit = parseInt(c.req.query("limit") ?? "10", 10);

    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("limit must be between 1 and 100", "limit");
    }

    const runs = store
      .getRuns()
      .sort((a, b) => {
        const aTime = a.startedAt?.getTime() ?? 0;
        const bTime = b.startedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return c.json({ data: runs.map(formatRun) });
  });

  // GET /api/runs/:id - Get run details
  app.get("/api/runs/:id", (c) => {
    const runId = c.req.param("id");
    const run = store.getRun(runId);
    if (!run) {
      throw new RunNotFoundError(runId);
    }

    return c.json({ data: formatRun(run) });
  });

  return app;
}
