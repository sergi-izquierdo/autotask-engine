import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("renders the correct label for each task status", () => {
    const statuses = [
      { status: "active" as const, label: "Active" },
      { status: "inactive" as const, label: "Inactive" },
      { status: "archived" as const, label: "Archived" },
    ];

    for (const { status, label } of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders the correct label for each run status", () => {
    const statuses = [
      { status: "pending" as const, label: "Pending" },
      { status: "running" as const, label: "Running" },
      { status: "success" as const, label: "Success" },
      { status: "failed" as const, label: "Failed" },
    ];

    for (const { status, label } of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("shows pulse animation for running status by default", () => {
    const { container } = render(<StatusBadge status="running" />);
    const pulseEl = container.querySelector(".animate-ping");
    expect(pulseEl).toBeInTheDocument();
  });

  it("does not show pulse for non-running status by default", () => {
    const { container } = render(<StatusBadge status="success" />);
    const pulseEl = container.querySelector(".animate-ping");
    expect(pulseEl).not.toBeInTheDocument();
  });

  it("can force pulse on any status via prop", () => {
    const { container } = render(<StatusBadge status="pending" pulse />);
    const pulseEl = container.querySelector(".animate-ping");
    expect(pulseEl).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<StatusBadge status="active" className="my-custom" />);
    expect(container.firstChild).toHaveClass("my-custom");
  });
});
