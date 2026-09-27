# syntax=docker/dockerfile:1
# Multi-arch (linux/amd64, linux/arm64): all dependencies are pure JavaScript
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only, in their own cached layer
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# App files (see .dockerignore allowlist); owned by root, read-only for the app user
COPY . .

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD [ "${ENABLE_WEB:-1}" != "1" ] || wget -qO /dev/null "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

# Extra args are passed through, e.g. `docker run ... ghcr.io/macaron27/motd-checker --discord`
ENTRYPOINT ["node", "server.js"]
