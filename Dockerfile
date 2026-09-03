# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.js sets output:'standalone', so the build emits a self-contained
# server bundle in .next/standalone that needs no node_modules at runtime.
#
# BACKEND_URL is deliberately NOT set here. It used to be a build arg, because
# next.config.js resolved the /proxy/* rewrite at build time and standalone
# builds serialise that into .next/required-server-files.json. The proxy is now
# a route handler that reads the variable per request, so the address is a
# runtime concern and one image works against any backend.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# BACKEND_URL is read per request by app/proxy/[...path]/route.ts, so the same
# image works against any backend without a rebuild. Defaults to
# http://localhost:47200 when unset.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
