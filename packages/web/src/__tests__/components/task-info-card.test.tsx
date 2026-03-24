import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskInfoCard } from "@/components/tasks/task-info-card";
import type { Task } from "@autotask/core";

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Task",
    description: "A test task description",
    schedule: "*/5 * * * *",
    handler: "handlers/test-handler",
    config: { retries: 3, timeout: 5000 },
    status: "active",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-16T12:00:00Z"),
    ...overrides,
  };
}

describe("TaskInfoCard", () => {
  it("renders task configuration details", () => {
    render(<TaskInfoCard task={createMockTask()} />);

    expect(screen.getByText("Task Configuration")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("A test task description")).toBeInTheDocument();
    expect(screen.getByText("*/5 * * * *")).toBeInTheDocument();
    expect(screen.getByText("handlers/test-handler")).toBeInTheDocument();
  });

  it("renders config as JSON", () => {
    render(<TaskInfoCard task={createMockTask()} />);

    expect(screen.getByText(/retries/)).toBeInTheDocument();
    expect(screen.getByText(/5000/)).toBeInTheDocument();
  });

  it("renders without optional description", () => {
    render(<TaskInfoCard task={createMockTask({ description: undefined })} />);

    expect(screen.getByText("Task Configuration")).toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("renders without config when empty", () => {
    render(<TaskInfoCard task={createMockTask({ config: {} })} />);

    expect(screen.queryByText("Config")).not.toBeInTheDocument();
  });

  it("shows correct badge variant for different statuses", () => {
    const { rerender } = render(<TaskInfoCard task={createMockTask()} />);
    expect(screen.getByText("active")).toBeInTheDocument();

    rerender(<TaskInfoCard task={createMockTask({ status: "inactive" })} />);
    expect(screen.getByText("inactive")).toBeInTheDocument();

    rerender(<TaskInfoCard task={createMockTask({ status: "archived" })} />);
    expect(screen.getByText("archived")).toBeInTheDocument();
  });
});
