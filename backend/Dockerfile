# ── Backend Dockerfile ──────────────────────────────────────────
# Clean production image for Node.js/Express API
# ────────────────────────────────────────────────────────────────

FROM node:18-alpine AS base

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

# Copy dependency manifests first (layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY . .

# Switch to non-root user
USER appuser

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

# Start the server
CMD ["node", "server.js"]
