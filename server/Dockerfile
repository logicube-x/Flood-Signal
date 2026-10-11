# ==============================================================================
# FloodSignal Backend Production Dockerfile for AWS ECS / Fargate
# Multi-stage build using official Node.js 22 LTS Alpine image
# ==============================================================================

FROM node:22-alpine AS dependencies

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies strictly from lockfile
RUN npm ci --omit=dev

# ==============================================================================
# Final Production Runtime Stage
# ==============================================================================
FROM node:22-alpine AS runner

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5001

# Run as non-root user for container security
USER node

WORKDIR /usr/src/app

# Copy production node_modules from dependencies stage
COPY --chown=node:node --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy application source files
COPY --chown=node:node package.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node models ./models
COPY --chown=node:node routes ./routes

# Expose container network port
EXPOSE 5001

# Container healthcheck using Node.js built-in fetch
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5001) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the Express server entrypoint
CMD ["node", "index.js"]
