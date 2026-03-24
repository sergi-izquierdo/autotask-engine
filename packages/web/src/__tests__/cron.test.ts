import { describe, it, expect } from "vitest";
import { isValidCron, getNextRuns, CRON_PRESETS } from "@/lib/cron";

describe("isValidCron", () => {
  it("returns true for valid cron expressions", () => {
    expect(isValidCron("* * * * *")).toBe(true);
    expect(isValidCron("*/5 * * * *")).toBe(true);
    expect(isValidCron("0 0 * * *")).toBe(true);
    expect(isValidCron("0 9 * * 1")).toBe(true);
    expect(isValidCron("0 0 1 * *")).toBe(true);
  });

  it("returns false for invalid cron expressions", () => {
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("not a cron")).toBe(false);
    expect(isValidCron("60 * * * *")).toBe(false);
    expect(isValidCron("* * * *")).toBe(false);
  });
});

describe("getNextRuns", () => {
  it("returns the correct number of runs", () => {
    const runs = getNextRuns("* * * * *", 5);
    expect(runs).toHaveLength(5);
  });

  it("returns Date objects", () => {
    const runs = getNextRuns("0 * * * *", 3);
    expect(runs).toHaveLength(3);
    for (const run of runs) {
      expect(run).toBeInstanceOf(Date);
    }
  });

  it("returns runs in ascending order", () => {
    const runs = getNextRuns("*/15 * * * *", 5);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime());
    }
  });

  it("returns empty array for invalid expressions", () => {
    expect(getNextRuns("invalid", 5)).toEqual([]);
    expect(getNextRuns("", 5)).toEqual([]);
  });

  it("defaults to 5 runs", () => {
    const runs = getNextRuns("* * * * *");
    expect(runs).toHaveLength(5);
  });
});

describe("CRON_PRESETS", () => {
  it("all presets have valid cron expressions", () => {
    for (const preset of CRON_PRESETS) {
      expect(isValidCron(preset.value)).toBe(true);
    }
  });

  it("all presets have a label and value", () => {
    for (const preset of CRON_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.value).toBeTruthy();
    }
  });
});
