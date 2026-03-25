import type { Hono } from "hono";
import type { createBunWebSocket } from "hono/bun";
import type { ClientMessage, ServerMessage } from "./types.js";
import { ConnectionManager } from "./connection-manager.js";

export function registerWebSocketRoute(
  app: Hono,
  upgradeWebSocket: ReturnType<typeof createBunWebSocket>["upgradeWebSocket"],
  manager: ConnectionManager,
): void {
  app.get(
    "/api/ws",
    upgradeWebSocket(() => {
      let connectionId: string | null = null;

      return {
        onOpen(_evt, ws) {
          connectionId = manager.add(ws);
        },

        onMessage(evt, ws) {
          if (connectionId === null) return;

          let msg: ClientMessage;
          try {
            const data =
              typeof evt.data === "string"
                ? evt.data
                : new TextDecoder().decode(evt.data as ArrayBuffer);
            msg = JSON.parse(data) as ClientMessage;
          } catch {
            const errorMsg: ServerMessage = {
              type: "error",
              message: "Invalid JSON",
            };
            ws.send(JSON.stringify(errorMsg));
            return;
          }

          switch (msg.type) {
            case "subscribe": {
              if (!Array.isArray(msg.taskIds)) {
                manager.send(connectionId, {
                  type: "error",
                  message: "taskIds must be an array",
                });
                return;
              }
              const added = manager.subscribe(connectionId, msg.taskIds);
              manager.send(connectionId, {
                type: "subscribed",
                taskIds: added,
              });
              break;
            }

            case "unsubscribe": {
              if (!Array.isArray(msg.taskIds)) {
                manager.send(connectionId, {
                  type: "error",
                  message: "taskIds must be an array",
                });
                return;
              }
              const removed = manager.unsubscribe(connectionId, msg.taskIds);
              manager.send(connectionId, {
                type: "unsubscribed",
                taskIds: removed,
              });
              break;
            }

            case "ping": {
              manager.send(connectionId, { type: "pong" });
              break;
            }

            default: {
              manager.send(connectionId, {
                type: "error",
                message: `Unknown message type: ${(msg as Record<string, unknown>).type}`,
              });
            }
          }
        },

        onClose() {
          if (connectionId !== null) {
            manager.remove(connectionId);
            connectionId = null;
          }
        },
      };
    }),
  );
}
