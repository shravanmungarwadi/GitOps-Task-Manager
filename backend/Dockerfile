# ============================================================
# backend/Dockerfile
# Multi-stage build for Node.js + Express backend
#
# STAGE 1 (builder) — install dependencies
# STAGE 2 (runner)  — lean production image, non-root user
# ============================================================

# ── STAGE 1: Builder ─────────────────────────────────────────
# node:20-alpine = Node 20 on tiny Alpine Linux (5MB base)
FROM node:20-alpine AS builder

# All commands from here run inside /app in the container
WORKDIR /app

# Copy ONLY package files first.
# Why? Docker caches each layer. If package.json hasn't changed,
# Docker reuses the cached npm install — MUCH faster builds.
COPY package.json package-lock.json ./

# Install only production dependencies (skips nodemon, etc.)
# npm ci = clean install, faster and more reliable than npm install
RUN npm ci --only=production

# Now copy the source code AFTER npm install
# So the npm cache layer is reused on code-only changes
COPY src/ ./src/

# ── STAGE 2: Runner ──────────────────────────────────────────
# Start fresh — NOTHING from Stage 1 carries over
# except what we explicitly COPY below
FROM node:20-alpine AS runner

# Tells Express to run in production mode (disables debug, optimises perf)
ENV NODE_ENV=production

WORKDIR /app

# Security: create a non-root user to run the app.
# If attacker exploits the app, they get "nodejs" user — not root.
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy installed node_modules from Stage 1
COPY --from=builder /app/node_modules ./node_modules

# Copy application source from Stage 1
COPY --from=builder /app/src ./src

# Copy package.json (Node needs it to find the entry point)
COPY --from=builder /app/package.json ./package.json

# Switch to the non-root user
USER nodejs

# Tell Docker this container listens on port 5000
EXPOSE 5000

# Health check: Docker pings /health every 30s.
# If it fails 3 times → container marked as "unhealthy"
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the app
CMD ["node", "src/index.js"]