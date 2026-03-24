import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../toast";

function TestConsumer() {
  const { addToast } = useToast();

  return (
    <div>
      <button
        onClick={() => addToast({ title: "Success!", description: "It worked", variant: "success" })}
      >
        Add Success
      </button>
      <button
        onClick={() => addToast({ title: "Error!", variant: "error" })}
      >
        Add Error
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows and auto-dismisses a toast", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByText("Add Success"));
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("It worked")).toBeInTheDocument();

    // Auto-dismiss after 5 seconds
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(screen.queryByText("Success!")).not.toBeInTheDocument();
  });

  it("renders toast with correct variant", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByText("Add Error"));
    });

    const toast = screen.getByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("dismisses toast on X button click", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByText("Add Success"));
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByLabelText("Dismiss"));
    });

    expect(screen.queryByText("Success!")).not.toBeInTheDocument();
  });
});
