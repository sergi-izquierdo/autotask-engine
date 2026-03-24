"use client";

import { createContext, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import type { Task, TaskRun } from "@autotask/core";
import { useWebSocket, type WebSocketStatus } from "@/hooks/use-websocket";
import type { WsServerEvent } from "@/lib/ws-types";
import { env } from "@/lib/env";

type TaskMap = Map<string, Task>;
type RunMap = Map<string, TaskRun[]>;

interface WsContextValue {
  status: WebSocketStatus;
  tasks: TaskMap;
  runs: RunMap;
  subscribe: (handler: (event: WsServerEvent) => void) => () => void;
  reconnect: () => void;
}

const WsContext = createContext<WsContextValue | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const tasksRef = useRef<TaskMap>(new Map());
  const runsRef = useRef<RunMap>(new Map());

  const { status, subscribe, reconnect } = useWebSocket({
    url: env.WS_URL,
  });

  const handleEvent = useCallback((event: WsServerEvent) => {
    switch (event.type) {
      case "task:updated": {
        const task = event.payload;
        tasksRef.current = new Map(tasksRef.current).set(task.id, task);
        break;
      }
      case "run:started":
      case "run:completed":
      case "run:failed": {
        const run = event.payload;
        const taskRuns = runsRef.current.get(run.taskId) ?? [];
        const existingIdx = taskRuns.findIndex((r) => r.id === run.id);
        const updatedRuns = [...taskRuns];
        if (existingIdx >= 0) {
          updatedRuns[existingIdx] = run;
        } else {
          updatedRuns.unshift(run);
        }
        runsRef.current = new Map(runsRef.current).set(run.taskId, updatedRuns);
        break;
      }
      case "run:progress": {
        const { runId, taskId, status: runStatus } = event.payload;
        const taskRuns = runsRef.current.get(taskId) ?? [];
        const updatedRuns = taskRuns.map((r) => (r.id === runId ? { ...r, status: runStatus } : r));
        runsRef.current = new Map(runsRef.current).set(taskId, updatedRuns);
        break;
      }
      case "connected":
        break;
    }
  }, []);

  useEffect(() => {
    return subscribe(handleEvent);
  }, [subscribe, handleEvent]);

  const value = useMemo<WsContextValue>(
    () => ({
      status,
      tasks: tasksRef.current,
      runs: runsRef.current,
      subscribe,
      reconnect,
    }),
    [status, subscribe, reconnect],
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWsContext(): WsContextValue {
  const ctx = useContext(WsContext);
  if (!ctx) {
    throw new Error("useWsContext must be used within a <WsProvider>");
  }
  return ctx;
}
