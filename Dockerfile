FROM oven/bun:1.3 AS build

WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY backend ./backend

RUN bun install --frozen-lockfile
RUN bun run --cwd packages/shared build
RUN bun run --cwd backend build

FROM oven/bun:1.3-slim

WORKDIR /app
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./

EXPOSE 3000
ENV PORT=3000
ENV BM_DB_PATH=/data/bookmarks.db

VOLUME ["/data"]

CMD ["bun", "run", "dist/index.js"]
