"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, TaskRun } from "@autotask/core";
import { useWsContext } from "@/components/ws-provider";
import type { WsServerEvent } from "@/lib/ws-types";
import { api } from "@/lib/api-client";

/** Fetch tasks from REST API and keep them updated via WebSocket */
export function useTaskList() {
  const { subscribe } = useWsContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Task[]>("/tasks")
      .then((data) => {
        if (!cancelled) {
          setTasks(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tasks");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (event: WsServerEvent) => {
      if (event.type === "task:updated") {
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === event.payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = event.payload;
            return next;
          }
          return [event.payload, ...prev];
        });
      }
    };
    return subscribe(handler);
  }, [subscribe]);

  return { tasks, loading, error };
}

/** Fetch runs for a task and keep them updated via WebSocket */
export function useTaskRuns(taskId: string) {
  const { subscribe } = useWsContext();
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<TaskRun[]>(`/tasks/${taskId}/runs`)
      .then((data) => {
        if (!cancelled) {
          setRuns(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleEvent = useCallback(
    (event: WsServerEvent) => {
      if (
        (event.type === "run:started" ||
          event.type === "run:completed" ||
          event.type === "run:failed") &&
        event.payload.taskId === taskId
      ) {
        setRuns((prev) => {
          const idx = prev.findIndex((r) => r.id === event.payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = event.payload;
            return next;
          }
          return [event.payload, ...prev];
        });
      }

      if (event.type === "run:progress" && event.payload.taskId === taskId) {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === event.payload.runId ? { ...r, status: event.payload.status } : r,
          ),
        );
      }
    },
    [taskId],
  );

  useEffect(() => {
    return subscribe(handleEvent);
  }, [subscribe, handleEvent]);

  return { runs, loading, error };
}

/** Fetch a single task and keep it updated via WebSocket */
export function useTask(taskId: string) {
  const { subscribe } = useWsContext();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Task>(`/tasks/${taskId}`)
      .then((data) => {
        if (!cancelled) {
          setTask(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load task");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    const handler = (event: WsServerEvent) => {
      if (event.type === "task:updated" && event.payload.id === taskId) {
        setTask(event.payload);
      }
    };
    return subscribe(handler);
  }, [subscribe, taskId]);

  return { task, loading, error };
}
