import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunHistoryTable } from "@/components/tasks/run-history-table";
import type { TaskRun } from "@autotask/core";

const mockRuns: TaskRun[] = [
  {
    id: "run-1",
    taskId: "task-1",
    status: "success",
    startedAt: new Date("2024-01-15T10:00:00Z"),
    finishedAt: new Date("2024-01-15T10:00:05Z"),
    result: { success: true, data: { processed: 42 } },
  },
  {
    id: "run-2",
    taskId: "task-1",
    status: "failed",
    startedAt: new Date("2024-01-14T10:00:00Z"),
    finishedAt: new Date("2024-01-14T10:01:30Z"),
    error: "Connection timeout",
  },
  {
    id: "run-3",
    taskId: "task-1",
    status: "running",
    startedAt: new Date("2024-01-16T10:00:00Z"),
  },
  {
    id: "run-4",
    taskId: "task-1",
    status: "pending",
  },
];

describe("RunHistoryTable", () => {
  it("renders empty state when no runs", () => {
    render(<RunHistoryTable runs={[]} />);

    expect(screen.getByText("Run History")).toBeInTheDocument();
    expect(screen.getByText(/No runs yet/)).toBeInTheDocument();
  });

  it("renders run rows with status badges", () => {
    render(<RunHistoryTable runs={mockRuns} />);

    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<RunHistoryTable runs={mockRuns} />);

    const thead = screen.getAllByRole("columnheader");
    const headerTexts = thead.map((th) => th.textContent);
    expect(headerTexts).toContain("Status");
    expect(headerTexts).toContain("Started");
    expect(headerTexts).toContain("Finished");
    expect(headerTexts).toContain("Duration");
  });

  it("expands a row to show error on click", async () => {
    const user = userEvent.setup();
    render(<RunHistoryTable runs={[mockRuns[1]]} />);

    expect(screen.queryByText("Connection timeout")).not.toBeInTheDocument();

    const row = screen.getByText("failed").closest("button");
    expect(row).toBeTruthy();
    await user.click(row as HTMLElement);

    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
  });

  it("expands a row to show result data", async () => {
    const user = userEvent.setup();
    render(<RunHistoryTable runs={[mockRuns[0]]} />);

    const row = screen.getByText("success").closest("button");
    expect(row).toBeTruthy();
    await user.click(row as HTMLElement);

    expect(screen.getByText(/processed/)).toBeInTheDocument();
  });

  it("collapses an expanded row on second click", async () => {
    const user = userEvent.setup();
    render(<RunHistoryTable runs={[mockRuns[1]]} />);

    const row = screen.getByText("failed").closest("button");
    expect(row).toBeTruthy();
    await user.click(row as HTMLElement);
    expect(screen.getByText("Connection timeout")).toBeInTheDocument();

    await user.click(row as HTMLElement);
    expect(screen.queryByText("Connection timeout")).not.toBeInTheDocument();
  });
});
