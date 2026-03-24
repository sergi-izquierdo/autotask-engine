"use client";

import type { Task } from "@autotask/core";
import { Calendar, Code, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusVariantMap: Record<string, "success" | "secondary" | "outline"> = {
  active: "success",
  inactive: "secondary",
  archived: "outline",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TaskInfoCardProps {
  task: Task;
}

export function TaskInfoCard({ task }: TaskInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Task Configuration</CardTitle>
          <Badge variant={statusVariantMap[task.status] ?? "secondary"}>{task.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {task.description && (
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Description
              </dt>
              <dd className="mt-1 text-sm text-foreground">{task.description}</dd>
            </div>
          )}
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Schedule
            </dt>
            <dd className="mt-1 font-mono text-sm text-foreground">{task.schedule}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Code className="h-4 w-4" />
              Handler
            </dt>
            <dd className="mt-1 font-mono text-sm text-foreground">{task.handler}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Created
            </dt>
            <dd className="mt-1 text-sm text-foreground">{formatDate(task.createdAt)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Updated
            </dt>
            <dd className="mt-1 text-sm text-foreground">{formatDate(task.updatedAt)}</dd>
          </div>
          {task.config && Object.keys(task.config).length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Config</dt>
              <dd className="mt-1">
                <pre className="rounded-lg bg-muted p-3 text-xs text-foreground overflow-x-auto">
                  {JSON.stringify(task.config, null, 2)}
                </pre>
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
