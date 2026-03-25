"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, TaskStatus } from "@autotask/core";
import { api, ApiError } from "@/lib/api-client";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface UseTasksOptions {
  page?: number;
  limit?: number;
  status?: TaskStatus | "all";
  search?: string;
}

interface UseTasksResult {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksResult {
  const { page = 1, limit = 10, status = "all", search = "" } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (status !== "all") {
        params.set("status", status);
      }
      if (search) {
        params.set("search", search);
      }

      const result = await api.get<PaginatedResponse<Task>>(
        `/tasks?${params.toString()}`,
      );
      setTasks(result.data);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch tasks");
      }
      setTasks([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, total, isLoading, error, refetch: fetchTasks };
}
