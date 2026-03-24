export { tasks, taskRuns } from "./schema.js";
export type {
  TaskRow,
  NewTaskRow,
  TaskRunRow,
  NewTaskRunRow,
} from "./schema.js";

export { createDatabase } from "./connection.js";
export type { AppDatabase, DatabaseOptions } from "./connection.js";

export { runMigrations } from "./migrate.js";

export {
  insertTask,
  getTaskById,
  listTasks,
  updateTask,
  deleteTask,
  insertTaskRun,
  getTaskRunById,
  listTaskRunsByTaskId,
  updateTaskRun,
} from "./queries.js";
