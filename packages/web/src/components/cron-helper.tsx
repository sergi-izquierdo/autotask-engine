"use client";

import { useMemo } from "react";
import { Clock, Calendar } from "lucide-react";
import { getNextRuns, CRON_PRESETS } from "@/lib/cron";

interface CronHelperProps {
  expression: string;
  onSelect: (value: string) => void;
}

export function CronHelper({ expression, onSelect }: CronHelperProps) {
  const nextRuns = useMemo(() => {
    if (!expression.trim()) return [];
    return getNextRuns(expression, 5);
  }, [expression]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onSelect(preset.value)}
              className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {nextRuns.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Next 5 runs
          </p>
          <ul className="space-y-1">
            {nextRuns.map((run, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  {run.toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {run.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground">
          Format: <code className="rounded bg-muted px-1 py-0.5">minute hour day month weekday</code>
        </p>
      </div>
    </div>
  );
}
