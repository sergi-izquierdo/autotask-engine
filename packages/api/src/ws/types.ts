import type { TaskRunStatus } from "@autotask/core";

/** Messages sent from client to server */
export type ClientMessage =
  | { type: "subscribe"; taskIds: string[] }
  | { type: "unsubscribe"; taskIds: string[] }
  | { type: "ping" };

/** Messages sent from server to client */
export type ServerMessage =
  | {
      type: "task:update";
      payload: {
        taskId: string;
        runId: string;
        status: TaskRunStatus;
        timestamp: string;
        error?: string;
      };
    }
  | { type: "subscribed"; taskIds: string[] }
  | { type: "unsubscribed"; taskIds: string[] }
  | { type: "pong" }
  | { type: "error"; message: string };
