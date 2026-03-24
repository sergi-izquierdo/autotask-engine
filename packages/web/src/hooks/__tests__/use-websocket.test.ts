import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../use-websocket";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("connects on mount and sets status to connected", () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://localhost:4000/ws" }),
    );

    expect(result.current.status).toBe("connecting");
    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    expect(result.current.status).toBe("connected");
  });

  it("does not connect when enabled is false", () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://localhost:4000/ws", enabled: false }),
    );

    expect(result.current.status).toBe("disconnected");
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("dispatches messages to subscribers", () => {
    const handler = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://localhost:4000/ws" }),
    );

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      result.current.subscribe(handler);
    });

    const event = { type: "connected" as const, payload: { clientId: "abc" } };

    act(() => {
      MockWebSocket.instances[0].simulateMessage(event);
    });

    expect(handler).toHaveBeenCalledWith(event);
    expect(result.current.lastEvent).toEqual(event);
  });

  it("unsubscribes correctly", () => {
    const handler = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://localhost:4000/ws" }),
    );

    let unsub: () => void;
    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      unsub = result.current.subscribe(handler);
    });

    act(() => {
      unsub();
    });

    act(() => {
      MockWebSocket.instances[0].simulateMessage({
        type: "connected",
        payload: { clientId: "abc" },
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("reconnects with exponential backoff on close", () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://localhost:4000/ws",
        baseDelay: 1000,
        maxRetries: 3,
      }),
    );

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });
    expect(result.current.status).toBe("connected");

    // Simulate unexpected close
    act(() => {
      MockWebSocket.instances[0].simulateClose();
    });
    expect(result.current.status).toBe("disconnected");

    // After first backoff delay (~1000ms), should reconnect
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("stops reconnecting after maxRetries", () => {
    renderHook(() =>
      useWebSocket({
        url: "ws://localhost:4000/ws",
        baseDelay: 100,
        maxRetries: 2,
      }),
    );

    // Close 1st connection
    act(() => {
      MockWebSocket.instances[0].simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Close 2nd connection
    act(() => {
      MockWebSocket.instances[1].simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not create a 3rd connection (maxRetries=2, so after 2 retries we stop)
    expect(MockWebSocket.instances).toHaveLength(3);

    // Close 3rd
    act(() => {
      MockWebSocket.instances[2].simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // No more reconnections
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("manual reconnect resets retry count", () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: "ws://localhost:4000/ws",
        baseDelay: 100,
        maxRetries: 1,
      }),
    );

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    // Close and exhaust retries
    act(() => {
      MockWebSocket.instances[0].simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      MockWebSocket.instances[1].simulateClose();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const countBefore = MockWebSocket.instances.length;

    // Manual reconnect should work
    act(() => {
      result.current.reconnect();
    });

    expect(MockWebSocket.instances.length).toBe(countBefore + 1);
  });

  it("ignores malformed messages", () => {
    const handler = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://localhost:4000/ws" }),
    );

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      result.current.subscribe(handler);
    });

    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: "not-json{" });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
