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

export { tasks, taskRuns, createDatabase, type DrizzleDB } from "./db/index.js";

export type {
  TaskRepository,
  CreateTaskInput,
  UpdateTaskInput,
  TaskRunRepository,
  CreateTaskRunInput,
  UpdateTaskRunStatusInput,
} from "./repositories/index.js";
export {
  DrizzleTaskRepository,
  DrizzleTaskRunRepository,
} from "./repositories/index.js";
