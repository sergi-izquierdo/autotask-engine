/**
 * Error codes for categorizing application errors.
 */
export enum ErrorCode {
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  TASK_EXECUTION_ERROR = "TASK_EXECUTION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SCHEDULE_ERROR = "SCHEDULE_ERROR",
  QUEUE_ERROR = "QUEUE_ERROR",
}

/**
 * Base application error with structured code, message, and optional cause.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public override readonly cause?: Error;

  constructor(code: ErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}

export class TaskNotFoundError extends AppError {
  public readonly taskId: string;

  constructor(taskId: string, cause?: Error) {
    super(ErrorCode.TASK_NOT_FOUND, `Task not found: ${taskId}`, cause);
    this.name = "TaskNotFoundError";
    this.taskId = taskId;
  }
}

export class TaskExecutionError extends AppError {
  public readonly taskId: string;

  constructor(taskId: string, message: string, cause?: Error) {
    super(ErrorCode.TASK_EXECUTION_ERROR, message, cause);
    this.name = "TaskExecutionError";
    this.taskId = taskId;
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, cause?: Error) {
    super(ErrorCode.VALIDATION_ERROR, message, cause);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class ScheduleError extends AppError {
  public readonly expression?: string;

  constructor(message: string, expression?: string, cause?: Error) {
    super(ErrorCode.SCHEDULE_ERROR, message, cause);
    this.name = "ScheduleError";
    this.expression = expression;
  }
}

export class QueueError extends AppError {
  public readonly jobId?: string;

  constructor(message: string, jobId?: string, cause?: Error) {
    super(ErrorCode.QUEUE_ERROR, message, cause);
    this.name = "QueueError";
    this.jobId = jobId;
  }
}
