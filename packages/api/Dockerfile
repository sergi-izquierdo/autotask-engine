FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

FROM base AS development
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
RUN npm ci --workspace=@autotask/core --workspace=@autotask/api --include-workspace-root
COPY packages/core/ packages/core/
COPY packages/api/ packages/api/
RUN npm run build --workspace=@autotask/core
CMD ["npm", "run", "dev", "--workspace=@autotask/api"]
