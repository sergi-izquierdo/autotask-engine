import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import type { WSContext } from "hono/ws";
import { ConnectionManager } from "./connection-manager.js";
import type { ServerMessage } from "./types.js";

function createMockWs(): WSContext {
  return {
    send: mock(() => {}),
    close: mock(() => {}),
    readyState: 1,
    raw: undefined,
    url: null,
    protocol: null,
  } as unknown as WSContext;
}

describe("ConnectionManager", () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager(60_000);
  });

  afterEach(() => {
    manager.dispose();
  });

  test("add registers a connection and returns an ID", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    expect(id).toBeDefined();
    expect(manager.size).toBe(1);
  });

  test("remove deletes the connection", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    manager.remove(id);
    expect(manager.size).toBe(0);
  });

  test("subscribe adds task IDs to connection subscriptions", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    const added = manager.subscribe(id, ["task-1", "task-2"]);

    expect(added).toEqual(["task-1", "task-2"]);
    expect(manager.getSubscriptions(id)).toContain("task-1");
    expect(manager.getSubscriptions(id)).toContain("task-2");
  });

  test("subscribe skips already subscribed IDs", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    manager.subscribe(id, ["task-1"]);
    const added = manager.subscribe(id, ["task-1", "task-2"]);

    expect(added).toEqual(["task-2"]);
  });

  test("subscribe returns empty for unknown connection", () => {
    const added = manager.subscribe("nonexistent", ["task-1"]);
    expect(added).toEqual([]);
  });

  test("unsubscribe removes task IDs", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    manager.subscribe(id, ["task-1", "task-2"]);
    const removed = manager.unsubscribe(id, ["task-1"]);

    expect(removed).toEqual(["task-1"]);
    expect(manager.getSubscriptions(id)).not.toContain("task-1");
    expect(manager.getSubscriptions(id)).toContain("task-2");
  });

  test("unsubscribe returns empty for unknown connection", () => {
    const removed = manager.unsubscribe("nonexistent", ["task-1"]);
    expect(removed).toEqual([]);
  });

  test("broadcast sends message to subscribed connections only", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    const ws3 = createMockWs();

    const id1 = manager.add(ws1);
    const id2 = manager.add(ws2);
    manager.add(ws3);

    manager.subscribe(id1, ["task-1"]);
    manager.subscribe(id2, ["task-1"]);
    // ws3 is not subscribed to task-1

    const message: ServerMessage = {
      type: "task:update",
      payload: {
        taskId: "task-1",
        runId: "run-1",
        status: "running",
        timestamp: new Date().toISOString(),
      },
    };

    manager.broadcast("task-1", message);

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(ws3.send).not.toHaveBeenCalled();
  });

  test("send delivers message to specific connection", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    const message: ServerMessage = { type: "pong" };

    manager.send(id, message);

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test("send removes connection on error", () => {
    const ws = createMockWs();
    (ws.send as ReturnType<typeof mock>).mockImplementation(() => {
      throw new Error("Connection closed");
    });

    const id = manager.add(ws);
    manager.send(id, { type: "pong" });

    expect(manager.size).toBe(0);
  });

  test("getSubscriptions returns empty set for unknown connection", () => {
    const subs = manager.getSubscriptions("nonexistent");
    expect(subs.size).toBe(0);
  });

  test("dispose cleans up all state", () => {
    const ws = createMockWs();
    manager.add(ws);
    manager.dispose();
    expect(manager.size).toBe(0);
  });

  test("remove cleans up subscriptions", () => {
    const ws = createMockWs();
    const id = manager.add(ws);
    manager.subscribe(id, ["task-1"]);
    manager.remove(id);

    expect(manager.getSubscriptions(id).size).toBe(0);
  });
});
