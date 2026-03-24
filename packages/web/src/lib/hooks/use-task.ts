"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, TaskRun } from "@autotask/core";
import { api, ApiError } from "@/lib/api-client";

interface UseTaskResult {
  task: Task | null;
  runs: TaskRun[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  triggerRun: () => Promise<void>;
  deleteTask: () => Promise<void>;
}

export function useTask(taskId: string): UseTaskResult {
  const [task, setTask] = useState<Task | null>(null);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [taskData, runsData] = await Promise.all([
        api.get<Task>(`/tasks/${taskId}`),
        api.get<TaskRun[]>(`/tasks/${taskId}/runs`),
      ]);
      setTask(taskData);
      setRuns(runsData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 404 ? "Task not found" : err.message);
      } else {
        setError("Failed to load task");
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const triggerRun = useCallback(async () => {
    await api.post(`/tasks/${taskId}/runs`);
    await fetchTask();
  }, [taskId, fetchTask]);

  const deleteTask = useCallback(async () => {
    await api.delete(`/tasks/${taskId}`);
  }, [taskId]);

  return { task, runs, loading, error, refresh: fetchTask, triggerRun, deleteTask };
}
