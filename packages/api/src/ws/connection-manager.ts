import type { WSContext } from "hono/ws";
import type { ServerMessage } from "./types.js";

export class ConnectionManager {
  /** Maps connection ID to its WSContext */
  private connections = new Map<string, WSContext>();

  /** Maps connection ID to set of subscribed task IDs */
  private subscriptions = new Map<string, Set<string>>();

  /** Counter for generating unique connection IDs */
  private nextId = 0;

  /** Heartbeat interval in ms */
  private readonly heartbeatIntervalMs: number;

  /** Interval timer for heartbeat */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(heartbeatIntervalMs = 30_000) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  /** Register a new connection and return its ID */
  add(ws: WSContext): string {
    const id = String(this.nextId++);
    this.connections.set(id, ws);
    this.subscriptions.set(id, new Set());

    if (this.connections.size === 1) {
      this.startHeartbeat();
    }

    return id;
  }

  /** Remove a connection and its subscriptions */
  remove(connectionId: string): void {
    this.connections.delete(connectionId);
    this.subscriptions.delete(connectionId);

    if (this.connections.size === 0) {
      this.stopHeartbeat();
    }
  }

  /** Subscribe a connection to task IDs */
  subscribe(connectionId: string, taskIds: string[]): string[] {
    const subs = this.subscriptions.get(connectionId);
    if (!subs) return [];

    const added: string[] = [];
    for (const id of taskIds) {
      if (!subs.has(id)) {
        subs.add(id);
        added.push(id);
      }
    }
    return added;
  }

  /** Unsubscribe a connection from task IDs */
  unsubscribe(connectionId: string, taskIds: string[]): string[] {
    const subs = this.subscriptions.get(connectionId);
    if (!subs) return [];

    const removed: string[] = [];
    for (const id of taskIds) {
      if (subs.delete(id)) {
        removed.push(id);
      }
    }
    return removed;
  }

  /** Broadcast a task update to all connections subscribed to a task */
  broadcast(taskId: string, message: ServerMessage): void {
    for (const [connectionId, subs] of this.subscriptions) {
      if (subs.has(taskId)) {
        this.send(connectionId, message);
      }
    }
  }

  /** Send a message to a specific connection */
  send(connectionId: string, message: ServerMessage): void {
    const ws = this.connections.get(connectionId);
    if (ws) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        this.remove(connectionId);
      }
    }
  }

  /** Get the number of active connections */
  get size(): number {
    return this.connections.size;
  }

  /** Get subscriptions for a connection */
  getSubscriptions(connectionId: string): ReadonlySet<string> {
    return this.subscriptions.get(connectionId) ?? new Set();
  }

  /** Start sending heartbeat pings to all connections */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const pong: ServerMessage = { type: "pong" };
      for (const [connectionId] of this.connections) {
        this.send(connectionId, pong);
      }
    }, this.heartbeatIntervalMs);
  }

  /** Stop the heartbeat timer */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Clean up all connections and timers */
  dispose(): void {
    this.stopHeartbeat();
    this.connections.clear();
    this.subscriptions.clear();
  }
}
