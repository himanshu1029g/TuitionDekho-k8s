# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

# Install dependencies with retry fallback
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || npm install --prefer-offline --no-audit --legacy-peer-deps

COPY . .

ARG VITE_API_URL=/
ARG VITE_API_WS_URL=/
ARG NODE_ENV=production

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_WS_URL=${VITE_API_WS_URL}
ENV NODE_ENV=${NODE_ENV}
ENV NODE_OPTIONS=--max-old-space-size=2048

# Run build with explicit timeout and verbose output
RUN npm run build -- --logLevel=info

# Prune dev dependencies in separate layer
RUN npm prune --omit=dev && npm cache clean --force

# Runtime stage
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN apk add --no-cache curl && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    rm -f /etc/nginx/conf.d/default.conf && \
    mkdir -p /var/cache/nginx /var/run/nginx && \
    chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=appuser:appgroup /app/dist .

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
