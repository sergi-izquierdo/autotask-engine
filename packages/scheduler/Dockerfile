FROM node:20-alpine AS base
WORKDIR /app

FROM base AS development
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/scheduler/package.json packages/scheduler/
RUN npm ci --workspace=@autotask/core --workspace=@autotask/scheduler --include-workspace-root
COPY packages/core/ packages/core/
COPY packages/scheduler/ packages/scheduler/
RUN npm run build --workspace=@autotask/core
CMD ["npm", "run", "dev", "--workspace=@autotask/scheduler"]
