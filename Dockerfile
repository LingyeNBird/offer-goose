FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-prod-store,target=/root/.local/share/pnpm/store pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY server ./server
EXPOSE 3000
CMD ["pnpm", "start"]
