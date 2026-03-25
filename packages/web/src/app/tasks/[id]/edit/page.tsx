"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type Task } from "@autotask/core";
import { api, ApiError } from "@/lib/api-client";
import { TaskForm } from "@/components/task-form";

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTask() {
      try {
        const data = await api.get<Task>(`/tasks/${params.id}`);
        setTask(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.status === 404 ? "Task not found." : err.message);
        } else {
          setError("Failed to load task.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [params.id]);

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
        <p className="text-destructive">{error ?? "Task not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Task</h1>
        <p className="text-muted-foreground">Update the configuration for &ldquo;{task.name}&rdquo;.</p>
      </div>
      <TaskForm task={task} />
    </div>
  );
}
