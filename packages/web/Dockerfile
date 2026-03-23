FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

FROM base AS development
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/
RUN npm ci --workspace=@autotask/core --workspace=@autotask/web --include-workspace-root
COPY packages/core/ packages/core/
COPY packages/web/ packages/web/
RUN npm run build --workspace=@autotask/core
CMD ["npm", "run", "dev", "--workspace=@autotask/web"]
