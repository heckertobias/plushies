# Stage 1: Install dependencies
FROM node:26-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:26-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Per-build deployment id (git SHA) for Next.js skew protection. Baked into the client bundle at
# build time, so it must be set before `next build`; no runtime env needed.
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID

RUN npm run build

# Stage 3: Run
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Europe/Berlin

RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output. public/ is NOT part of the standalone bundle and must be
# copied explicitly - without it, /sw.js 404s and push registration silently fails.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy drizzle migrations (needed at runtime for auto-migrate)
COPY --from=builder /app/drizzle ./drizzle

# No scripts/, lib/ or full node_modules here on purpose: copying the build's node_modules added
# ~608 MB (next, @next/swc, lucide-react, date-fns are runtime deps, so --omit=dev saves nothing).
# The standalone output ships what the server needs. The one-off maintenance script is run in a
# throwaway container instead - see the header of scripts/migrate-photos.ts.

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
