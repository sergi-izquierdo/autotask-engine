import type { Task, TaskStatus } from "../schemas/index.js";

export interface CreateTaskInput {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  handler: string;
  config?: Record<string, unknown>;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  schedule?: string;
  handler?: string;
  config?: Record<string, unknown>;
  status?: TaskStatus;
}

export interface TaskRepository {
  create(input: CreateTaskInput): Promise<Task>;
  getById(id: string): Promise<Task | null>;
  getAll(): Promise<Task[]>;
  update(id: string, input: UpdateTaskInput): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
  getByStatus(status: TaskStatus): Promise<Task[]>;
}
