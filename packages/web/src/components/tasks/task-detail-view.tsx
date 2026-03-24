"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTask } from "@/lib/hooks/use-task";
import { Button } from "@/components/ui/button";
import { TaskInfoCard } from "@/components/tasks/task-info-card";
import { RunHistoryTable } from "@/components/tasks/run-history-table";
import { TaskActions } from "@/components/tasks/task-actions";

interface TaskDetailViewProps {
  taskId: string;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const { task, runs, loading, error, triggerRun, deleteTask } = useTask(taskId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">{error ?? "Task not found"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{task.name}</h1>
            {task.description && (
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
            )}
          </div>
        </div>
        <TaskActions taskId={taskId} onTriggerRun={triggerRun} onDelete={deleteTask} />
      </div>

      <TaskInfoCard task={task} />

      <RunHistoryTable runs={runs} />
    </div>
  );
}
