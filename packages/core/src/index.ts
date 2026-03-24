export {
  ErrorCode,
  AppError,
  TaskNotFoundError,
  TaskExecutionError,
  ValidationError,
  ScheduleError,
} from "./errors.js";

export { type Result, ok, err, isOk, isErr } from "./result.js";

export {
  TaskResultSchema,
  type TaskResult,
  TaskSchema,
  TaskStatusSchema,
  type Task,
  type TaskStatus,
  parseTask,
  TaskRunSchema,
  TaskRunStatusSchema,
  type TaskRun,
  type TaskRunStatus,
  parseTaskRun,
} from "./schemas/index.js";

export {
  tasks,
  taskRuns,
  type TaskRow,
  type NewTaskRow,
  type TaskRunRow,
  type NewTaskRunRow,
  createDatabase,
  type AppDatabase,
  type DatabaseOptions,
  runMigrations,
  insertTask,
  getTaskById,
  listTasks,
  updateTask,
  deleteTask,
  insertTaskRun,
  getTaskRunById,
  listTaskRunsByTaskId,
  updateTaskRun,
} from "./db/index.js";
