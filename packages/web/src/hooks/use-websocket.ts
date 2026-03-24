"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WsServerEvent } from "@/lib/ws-types";

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

type EventHandler = (event: WsServerEvent) => void;

interface UseWebSocketOptions {
  /** WebSocket server URL */
  url: string;
  /** Whether to automatically connect (default: true) */
  enabled?: boolean;
  /** Maximum number of reconnect attempts (default: 10) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms for exponential backoff (default: 30000) */
  maxDelay?: number;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  lastEvent: WsServerEvent | null;
  subscribe: (handler: EventHandler) => () => void;
  reconnect: () => void;
}

export function useWebSocket({
  url,
  enabled = true,
  maxRetries = 10,
  baseDelay = 1000,
  maxDelay = 30000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WsServerEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Set<EventHandler>>(new Set());
  const enabledRef = useRef(enabled);
  const urlRef = useRef(url);

  enabledRef.current = enabled;
  urlRef.current = url;

  const clearReconnectTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const getBackoffDelay = useCallback(
    (attempt: number) => {
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = delay * 0.1 * Math.random();
      return Math.min(delay + jitter, maxDelay);
    },
    [baseDelay, maxDelay],
  );

  const connect = useCallback(() => {
    if (!enabledRef.current) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(retriesRef.current > 0 ? "reconnecting" : "connecting");

    const ws = new WebSocket(urlRef.current);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setStatus("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsServerEvent;
        setLastEvent(data);
        handlersRef.current.forEach((handler) => handler(data));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStatus("disconnected");

      if (enabledRef.current && retriesRef.current < maxRetries) {
        const delay = getBackoffDelay(retriesRef.current);
        retriesRef.current += 1;
        timeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, handling reconnection there
    };
  }, [maxRetries, getBackoffDelay, clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    clearReconnectTimeout();
    retriesRef.current = 0;
    connect();
  }, [connect, clearReconnectTimeout]);

  const subscribe = useCallback((handler: EventHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect, clearReconnectTimeout]);

  return { status, lastEvent, subscribe, reconnect };
}
