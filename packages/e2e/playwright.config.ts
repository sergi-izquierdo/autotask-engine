import { defineConfig, devices } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "src",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  metadata: {
    apiUrl: API_URL,
  },
});
