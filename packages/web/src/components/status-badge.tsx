"use client";

import type { TaskStatus, TaskRunStatus } from "@autotask/core";
import { cn } from "@/lib/utils";

type BadgeStatus = TaskStatus | TaskRunStatus;

const statusConfig: Record<BadgeStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-500/10 text-gray-500 dark:text-gray-500 border-gray-500/30",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  running: {
    label: "Running",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  success: {
    label: "Success",
    className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, className, pulse }: StatusBadgeProps) {
  const config = statusConfig[status];
  const shouldPulse = pulse ?? status === "running";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {config.label}
    </span>
  );
}
