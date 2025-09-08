# -----------------------------
# 1. Base image
# -----------------------------
FROM node:24-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./

# -----------------------------
# 2. Dependencies
# -----------------------------
FROM base AS deps
RUN npm ci

# -----------------------------
# 3. Build
# -----------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN npm run build

# -----------------------------
# 4. Production Runtime
# -----------------------------
FROM node:24-alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Copy only the standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080 || exit 1

# -----------------------------
# Start the Next.js standalone server
# -----------------------------
CMD ["node", "server.js"]

