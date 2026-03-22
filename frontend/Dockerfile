# ============================================================
# frontend/Dockerfile
# Multi-stage build for React + Vite frontend
#
# STAGE 1 (builder) — install deps, run Vite build → /dist
# STAGE 2 (runner)  — clean Nginx image, serve the /dist folder
# ============================================================

# ── STAGE 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package.json package-lock.json ./

# Install ALL deps including devDependencies
# We need devDeps here because Vite itself is a dev tool that runs the build
RUN npm ci

# Copy all source code
COPY . .

# Run Vite build — compiles React into static files
# Output goes to /app/dist (set in vite.config.js)
RUN npm run build

# ── STAGE 2: Runner ──────────────────────────────────────────
# Start fresh from a clean Nginx alpine image
# Nginx is tiny and perfect for serving static files
FROM nginx:alpine AS runner

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React app from Stage 1 into Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Tell Docker this container listens on port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1

# Start Nginx in foreground (daemon off keeps the container alive)
CMD ["nginx", "-g", "daemon off;"]