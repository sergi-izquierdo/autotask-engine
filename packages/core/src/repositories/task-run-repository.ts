import type { TaskRun, TaskRunStatus } from "../schemas/index.js";
import type { TaskResult } from "../schemas/index.js";

export interface CreateTaskRunInput {
  id: string;
  taskId: string;
  status?: TaskRunStatus;
}

export interface UpdateTaskRunStatusInput {
  status: TaskRunStatus;
  startedAt?: Date;
  finishedAt?: Date;
  result?: TaskResult;
  error?: string;
}

export interface TaskRunRepository {
  create(input: CreateTaskRunInput): Promise<TaskRun>;
  getByTaskId(taskId: string): Promise<TaskRun[]>;
  getLatest(taskId: string): Promise<TaskRun | null>;
  updateStatus(
    id: string,
    input: UpdateTaskRunStatusInput,
  ): Promise<TaskRun | null>;
}
