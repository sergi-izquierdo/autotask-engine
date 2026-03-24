import type { Task, TaskRun, TaskRunStatus } from "@autotask/core";

/** Events sent from the server to the client over WebSocket */
export type WsServerEvent =
  | { type: "task:updated"; payload: Task }
  | { type: "run:started"; payload: TaskRun }
  | { type: "run:progress"; payload: { runId: string; taskId: string; status: TaskRunStatus } }
  | { type: "run:completed"; payload: TaskRun }
  | { type: "run:failed"; payload: TaskRun }
  | { type: "connected"; payload: { clientId: string } };

/** Extract payload type for a given event type */
export type WsEventPayload<T extends WsServerEvent["type"]> = Extract<
  WsServerEvent,
  { type: T }
>["payload"];
