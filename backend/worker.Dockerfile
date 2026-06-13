# ─── Base Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
COPY prisma ./prisma/

# ─── Dependencies Stage ───────────────────────────────────────────────────────
FROM base AS deps
RUN npm ci

# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production Worker Stage ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install only production deps + generate Prisma client
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy only the compiled worker output
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 worker
USER worker

# Worker has no HTTP port — it only talks to Redis and Postgres
CMD ["node", "dist/worker.js"]
