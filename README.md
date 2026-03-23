# AutoTask Engine

AI-powered task automation platform. Define workflows in natural language, execute them on schedule, learn from results.

## Architecture
- packages/core: Workflow engine, task definitions, execution runtime
- packages/api: REST API (Hono + Bun)
- packages/web: Dashboard (Next.js 15)
- packages/scheduler: Cron-based workflow scheduler
