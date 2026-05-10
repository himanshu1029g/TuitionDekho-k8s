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

# Local dist directly copy karo (already built)
COPY dist/ /usr/share/nginx/html

RUN chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html \
  && touch /var/run/nginx.pid \
  && chown -R appuser:appgroup /var/run/nginx.pid

USER appuser
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]