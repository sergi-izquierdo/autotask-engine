import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError, ErrorCode } from "@autotask/core";

const errorCodeToStatus: Record<ErrorCode, ContentfulStatusCode> = {
  [ErrorCode.TASK_NOT_FOUND]: 404,
  [ErrorCode.RUN_NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.TASK_EXECUTION_ERROR]: 500,
  [ErrorCode.SCHEDULE_ERROR]: 400,
};

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    const appError = err as AppError;
    const status = errorCodeToStatus[appError.code] ?? 500;
    return c.json(
      {
        error: {
          code: appError.code,
          message: appError.message,
        },
      },
      status,
    );
  }

  console.error("Unhandled error:", err);

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
}
