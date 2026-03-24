import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTask } from "@/lib/hooks/use-task";
import { api, ApiError } from "@/lib/api-client";
import type { Task, TaskRun } from "@autotask/core";

vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

const mockTask: Task = {
  id: "task-1",
  name: "Test Task",
  schedule: "*/5 * * * *",
  handler: "handlers/test",
  status: "active",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-16T12:00:00Z"),
};

const mockRuns: TaskRun[] = [
  {
    id: "run-1",
    taskId: "task-1",
    status: "success",
    startedAt: new Date("2024-01-15T10:00:00Z"),
    finishedAt: new Date("2024-01-15T10:00:05Z"),
    result: { success: true },
  },
];

const mockedApi = vi.mocked(api);

describe("useTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches task and runs on mount", async () => {
    mockedApi.get.mockImplementation((path: string) => {
      if (path === "/tasks/task-1") return Promise.resolve(mockTask);
      if (path === "/tasks/task-1/runs") return Promise.resolve(mockRuns);
      return Promise.reject(new Error("unexpected path"));
    });

    const { result } = renderHook(() => useTask("task-1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.task).toEqual(mockTask);
    expect(result.current.runs).toEqual(mockRuns);
    expect(result.current.error).toBeNull();
  });

  it("sets error on 404", async () => {
    mockedApi.get.mockRejectedValue(new ApiError(404, "Not found"));

    const { result } = renderHook(() => useTask("missing-task"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Task not found");
    expect(result.current.task).toBeNull();
  });

  it("sets generic error on non-404 failure", async () => {
    mockedApi.get.mockRejectedValue(new ApiError(500, "Server error"));

    const { result } = renderHook(() => useTask("task-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Server error");
  });

  it("sets fallback error for non-ApiError", async () => {
    mockedApi.get.mockRejectedValue(new Error("network failure"));

    const { result } = renderHook(() => useTask("task-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load task");
  });

  it("triggerRun posts and refreshes", async () => {
    mockedApi.get.mockImplementation((path: string) => {
      if (path === "/tasks/task-1") return Promise.resolve(mockTask);
      if (path === "/tasks/task-1/runs") return Promise.resolve(mockRuns);
      return Promise.reject(new Error("unexpected path"));
    });
    mockedApi.post.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTask("task-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.triggerRun();

    expect(mockedApi.post).toHaveBeenCalledWith("/tasks/task-1/runs");
    // fetchTask is called again after trigger (initial + refresh)
    expect(mockedApi.get).toHaveBeenCalledTimes(4);
  });

  it("deleteTask calls delete endpoint", async () => {
    mockedApi.get.mockImplementation((path: string) => {
      if (path === "/tasks/task-1") return Promise.resolve(mockTask);
      if (path === "/tasks/task-1/runs") return Promise.resolve(mockRuns);
      return Promise.reject(new Error("unexpected path"));
    });
    mockedApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTask("task-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.deleteTask();

    expect(mockedApi.delete).toHaveBeenCalledWith("/tasks/task-1");
  });
});
