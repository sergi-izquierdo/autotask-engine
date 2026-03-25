import type { TaskRun } from "./schemas/index.js";

/**
 * Interface for persisting TaskRun records.
 * Implementations may use a database, in-memory store, etc.
 */
export interface TaskRunRepository {
  save(run: TaskRun): Promise<void>;
}
