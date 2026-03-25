"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type Task } from "@autotask/core";
import { TaskFormSchema, type TaskFormValues, formValuesToPayload } from "@/lib/schemas";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CronHelper } from "@/components/cron-helper";

interface TaskFormProps {
  task?: Task;
}

type FieldErrors = Partial<Record<keyof TaskFormValues, string>>;

export function TaskForm({ task }: TaskFormProps) {
  const router = useRouter();
  const isEditing = !!task;

  const [values, setValues] = useState<TaskFormValues>({
    name: task?.name ?? "",
    description: task?.description ?? "",
    schedule: task?.schedule ?? "",
    handler: task?.handler ?? "",
    config: task?.config ? JSON.stringify(task.config, null, 2) : "",
    status: task?.status ?? "active",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field)),
      );
    }
  }

  function validate(): boolean {
    const result = TaskFormSchema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TaskFormValues;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = formValuesToPayload(values);

      if (isEditing) {
        await api.put(`/tasks/${task.id}`, payload);
        router.push(`/tasks/${task.id}`);
      } else {
        const created = await api.post<Task>("/tasks", payload);
        router.push(`/tasks/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Task" : "Create Task"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the task configuration below."
              : "Configure a new automated task with a cron schedule."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My automated task"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this task do?"
              rows={3}
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="handler">Handler</Label>
            <Input
              id="handler"
              placeholder="e.g. email-sender, data-sync"
              value={values.handler}
              onChange={(e) => updateField("handler", e.target.value)}
              aria-invalid={!!errors.handler}
            />
            {errors.handler && <p className="text-sm text-destructive">{errors.handler}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={values.status}
              onChange={(e) => updateField("status", e.target.value as TaskFormValues["status"])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Define when this task should run using a cron expression.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule">Cron Expression</Label>
            <Input
              id="schedule"
              placeholder="*/5 * * * *"
              value={values.schedule}
              onChange={(e) => updateField("schedule", e.target.value)}
              aria-invalid={!!errors.schedule}
              className="font-mono"
            />
            {errors.schedule && <p className="text-sm text-destructive">{errors.schedule}</p>}
          </div>

          <CronHelper
            expression={values.schedule}
            onSelect={(value) => updateField("schedule", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handler Configuration</CardTitle>
          <CardDescription>Optional JSON configuration passed to the handler at runtime.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="config">Config (JSON)</Label>
          <Textarea
            id="config"
            placeholder='{"key": "value"}'
            rows={5}
            value={values.config}
            onChange={(e) => updateField("config", e.target.value)}
            aria-invalid={!!errors.config}
            className="font-mono"
          />
          {errors.config && <p className="text-sm text-destructive">{errors.config}</p>}
        </CardContent>
      </Card>

      {submitError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Task" : "Create Task"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
