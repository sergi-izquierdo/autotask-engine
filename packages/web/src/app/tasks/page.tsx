"use client";

import Link from "next/link";
import { useTaskList } from "@/hooks/use-task-events";
import { StatusBadge } from "@/components/status-badge";
import { Loader2 } from "lucide-react";

export default function TasksPage() {
  const { tasks, loading, error } = useTaskList();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
      <p className="mt-2 text-muted-foreground">Monitor your automated tasks in real-time.</p>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          No tasks found. Create a task to get started.
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Handler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {task.name}
                    </Link>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                    {task.schedule}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                    {task.handler}
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
