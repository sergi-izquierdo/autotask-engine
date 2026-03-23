import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError, ErrorCode } from "@autotask/core";

const errorCodeToStatus: Record<ErrorCode, ContentfulStatusCode> = {
  [ErrorCode.TASK_NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.TASK_EXECUTION_ERROR]: 500,
  [ErrorCode.SCHEDULE_ERROR]: 400,
};

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    const status = errorCodeToStatus[err.code] ?? 500;
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
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
