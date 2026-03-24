"use client";

import { useState } from "react";
import type { TaskRun } from "@autotask/core";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const runStatusVariantMap: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  success: "success",
  failed: "destructive",
  running: "warning",
  pending: "secondary",
};

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(startedAt?: Date | string, finishedAt?: Date | string): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const ms = end - start;

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

interface RunDetailProps {
  run: TaskRun;
}

function RunDetail({ run }: RunDetailProps) {
  return (
    <div className="border-t bg-muted/50 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 text-sm">
        {run.error && (
          <div>
            <span className="font-medium text-destructive-foreground">Error:</span>
            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-destructive/10 p-2 text-xs text-destructive-foreground">
              {run.error}
            </pre>
          </div>
        )}
        {run.result && (
          <div>
            <span className="font-medium text-muted-foreground">Result:</span>
            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-foreground overflow-x-auto">
              {JSON.stringify(run.result, null, 2)}
            </pre>
          </div>
        )}
        {!run.error && !run.result && (
          <p className="text-muted-foreground">No output available for this run.</p>
        )}
      </div>
    </div>
  );
}

interface RunHistoryTableProps {
  runs: TaskRun[];
}

export function RunHistoryTable({ runs }: RunHistoryTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Run History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {runs.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            No runs yet. Click &quot;Run Now&quot; to trigger the first execution.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t text-left text-muted-foreground">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Finished</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isExpanded = expandedIds.has(run.id);
                  return (
                    <tr key={run.id} className="group">
                      <td colSpan={5} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(run.id)}
                          className={cn(
                            "flex w-full items-center text-left transition-colors hover:bg-muted/50",
                            isExpanded && "bg-muted/30",
                          )}
                        >
                          <span className="w-8 px-4 py-3 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                          <span className="flex-1 px-4 py-3">
                            <Badge variant={runStatusVariantMap[run.status] ?? "secondary"}>
                              {run.status}
                            </Badge>
                          </span>
                          <span className="flex-1 px-4 py-3 text-foreground">
                            {formatDate(run.startedAt)}
                          </span>
                          <span className="flex-1 px-4 py-3 text-foreground">
                            {formatDate(run.finishedAt)}
                          </span>
                          <span className="flex-1 px-4 py-3 font-mono text-foreground">
                            {formatDuration(run.startedAt, run.finishedAt)}
                          </span>
                        </button>
                        {isExpanded && <RunDetail run={run} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
