import { CronExpressionParser } from "cron-parser";

export function isValidCron(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  const fields = trimmed.split(/\s+/);
  if (fields.length < 5 || fields.length > 6) return false;
  try {
    CronExpressionParser.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function getNextRuns(expression: string, count: number = 5): Date[] {
  if (!expression.trim()) return [];
  try {
    const interval = CronExpressionParser.parse(expression);
    const runs: Date[] = [];
    for (let i = 0; i < count; i++) {
      runs.push(interval.next().toDate());
    }
    return runs;
  } catch {
    return [];
  }
}

export const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at noon", value: "0 12 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Every 1st of month", value: "0 0 1 * *" },
] as const;
