import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createBunWebSocket } from "hono/bun";
import { createApp } from "../app.js";
import type { ServerMessage } from "./types.js";

const TEST_PORT = 9876;

let server: ReturnType<typeof Bun.serve>;
let connectionManager: ReturnType<typeof createApp>["connectionManager"];

beforeAll(() => {
  const { upgradeWebSocket, websocket } = createBunWebSocket();
  const result = createApp({ upgradeWebSocket });
  connectionManager = result.connectionManager;

  server = Bun.serve({
    port: TEST_PORT,
    fetch: result.app.fetch,
    websocket,
  });
});

afterAll(() => {
  connectionManager.dispose();
  server.stop(true);
});

function connectWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}/api/ws`);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(e);
  });
}

function waitForMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.onmessage = (evt) => {
      resolve(JSON.parse(evt.data as string) as ServerMessage);
    };
  });
}

function sendAndReceive(
  ws: WebSocket,
  message: Record<string, unknown>,
): Promise<ServerMessage> {
  const promise = waitForMessage(ws);
  ws.send(JSON.stringify(message));
  return promise;
}

describe("WebSocket endpoint", () => {
  test("connects to /api/ws", async () => {
    const ws = await connectWs();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test("responds to ping with pong", async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, { type: "ping" });
    expect(response).toEqual({ type: "pong" });
    ws.close();
  });

  test("subscribe confirms with subscribed message", async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: "subscribe",
      taskIds: ["task-a", "task-b"],
    });
    expect(response.type).toBe("subscribed");
    if (response.type === "subscribed") {
      expect(response.taskIds).toContain("task-a");
      expect(response.taskIds).toContain("task-b");
    }
    ws.close();
  });

  test("unsubscribe confirms with unsubscribed message", async () => {
    const ws = await connectWs();
    await sendAndReceive(ws, {
      type: "subscribe",
      taskIds: ["task-a"],
    });
    const response = await sendAndReceive(ws, {
      type: "unsubscribe",
      taskIds: ["task-a"],
    });
    expect(response.type).toBe("unsubscribed");
    if (response.type === "unsubscribed") {
      expect(response.taskIds).toEqual(["task-a"]);
    }
    ws.close();
  });

  test("invalid JSON returns error", async () => {
    const ws = await connectWs();
    const promise = waitForMessage(ws);
    ws.send("not valid json{{{");
    const response = await promise;
    expect(response.type).toBe("error");
    if (response.type === "error") {
      expect(response.message).toBe("Invalid JSON");
    }
    ws.close();
  });

  test("unknown message type returns error", async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, { type: "unknown_type" });
    expect(response.type).toBe("error");
    if (response.type === "error") {
      expect(response.message).toContain("Unknown message type");
    }
    ws.close();
  });

  test("broadcast delivers task update to subscribed client", async () => {
    const ws = await connectWs();

    await sendAndReceive(ws, {
      type: "subscribe",
      taskIds: ["task-x"],
    });

    const messagePromise = waitForMessage(ws);

    connectionManager.broadcast("task-x", {
      type: "task:update",
      payload: {
        taskId: "task-x",
        runId: "run-1",
        status: "running",
        timestamp: "2025-01-01T00:00:00Z",
      },
    });

    const response = await messagePromise;
    expect(response.type).toBe("task:update");
    if (response.type === "task:update") {
      expect(response.payload.taskId).toBe("task-x");
      expect(response.payload.status).toBe("running");
    }
    ws.close();
  });

  test("broadcast does not deliver to unsubscribed client", async () => {
    const ws = await connectWs();

    await sendAndReceive(ws, {
      type: "subscribe",
      taskIds: ["task-y"],
    });

    // Broadcast to a different task
    let received = false;
    ws.onmessage = () => {
      received = true;
    };

    connectionManager.broadcast("task-z", {
      type: "task:update",
      payload: {
        taskId: "task-z",
        runId: "run-2",
        status: "success",
        timestamp: "2025-01-01T00:00:00Z",
      },
    });

    // Wait a bit to ensure no message arrives
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).toBe(false);
    ws.close();
  });

  test("graceful disconnect cleans up connection", async () => {
    const ws = await connectWs();
    const sizeAfterConnect = connectionManager.size;
    expect(sizeAfterConnect).toBeGreaterThanOrEqual(1);

    ws.close();
    // Wait for close to propagate
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(connectionManager.size).toBe(sizeAfterConnect - 1);
  });
});
