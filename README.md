# AutoTask Engine

AI-powered task automation platform. Define workflows in natural language, execute them on schedule, learn from results.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (for local development without Docker)

### Using Docker Compose (recommended)

```bash
# Copy the environment template
cp .env.example .env

# Start all services (Redis, API, Scheduler, Web)
docker compose up

# Or start only Redis (for local development)
docker compose up redis
```

| Service   | URL                    | Description               |
| --------- | ---------------------- | ------------------------- |
| Web       | http://localhost:3000   | Dashboard UI              |
| API       | http://localhost:3001   | REST API                  |
| Redis     | localhost:6379          | Queue & cache             |

### Local Development (without Docker)

```bash
npm install
npm run dev
```

## Architecture

- packages/core: Workflow engine, task definitions, execution runtime
- packages/api: REST API (Hono + Bun)
- packages/web: Dashboard (Next.js 15)
- packages/scheduler: Cron-based workflow scheduler

## Docker Services

The `docker-compose.yml` provides the full development stack:

- **redis** — Redis 7 for BullMQ job queues and caching. Data persisted in a Docker volume.
- **api** — REST API with hot-reload. Source mounted from `packages/api/src`.
- **scheduler** — Cron-based workflow scheduler. Source mounted from `packages/scheduler/src`.
- **web** — Next.js dashboard with hot-reload. Source mounted from `packages/web/src`.

All services include health checks and will restart automatically on failure. The app services are optional — you can run `docker compose up redis` and develop locally against it.
