import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskActions } from "@/components/tasks/task-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("TaskActions", () => {
  const defaultProps = {
    taskId: "task-123",
    onTriggerRun: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Run Now, Edit, and Delete buttons", () => {
    render(<TaskActions {...defaultProps} />);

    expect(screen.getByText("Run Now")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onTriggerRun when Run Now is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskActions {...defaultProps} />);

    await user.click(screen.getByText("Run Now"));
    expect(defaultProps.onTriggerRun).toHaveBeenCalledTimes(1);
  });

  it("shows delete confirmation on Delete click", async () => {
    const user = userEvent.setup();
    render(<TaskActions {...defaultProps} />);

    await user.click(screen.getByText("Delete"));

    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onDelete when delete is confirmed", async () => {
    const user = userEvent.setup();
    render(<TaskActions {...defaultProps} />);

    await user.click(screen.getByText("Delete"));
    await user.click(screen.getByText("Confirm Delete"));

    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it("hides confirmation when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskActions {...defaultProps} />);

    await user.click(screen.getByText("Delete"));
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });
});
