"use client";

import { use } from "react";
import Link from "next/link";
import { useTask, useTaskRuns } from "@/hooks/use-task-events";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Loader2 } from "lucide-react";

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}

function formatDuration(start?: Date | string, end?: Date | string): string {
  if (!start) return "—";
  const s = typeof start === "string" ? new Date(start) : start;
  const e = end ? (typeof end === "string" ? new Date(end) : end) : new Date();
  const ms = e.getTime() - s.getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface TaskDetailPageProps {
  params: Promise<{ taskId: string }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = use(params);
  const { task, loading: taskLoading, error: taskError } = useTask(taskId);
  const { runs, loading: runsLoading, error: runsError } = useTaskRuns(taskId);

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading task...</span>
      </div>
    );
  }

  if (taskError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
        {taskError}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Task not found.
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{task.name}</h1>
          {task.description && (
            <p className="mt-1 text-muted-foreground">{task.description}</p>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Schedule
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">{task.schedule}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Handler
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">{task.handler}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Updated
          </p>
          <p className="mt-1 text-sm text-foreground">{formatDate(task.updatedAt)}</p>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Recent Runs</h2>

      {runsLoading && (
        <div className="mt-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading runs...</span>
        </div>
      )}

      {runsError && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
          {runsError}
        </div>
      )}

      {!runsLoading && !runsError && runs.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No runs recorded yet.</p>
      )}

      {!runsLoading && !runsError && runs.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Run ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">
                    {run.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {run.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
