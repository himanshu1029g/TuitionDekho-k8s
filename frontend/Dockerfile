# ── Frontend Dockerfile ─────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

ARG VITE_API_URL=http://backend:5000
ARG VITE_API_WS_URL=http://backend:5000

RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /usr/src/app/dist /usr/share/nginx/html

RUN chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]