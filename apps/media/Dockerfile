# ---------- BUILDER ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install Sharp dependencies
RUN apk add --no-cache python3 make g++ vips-dev

# Install dependencies
COPY package*.json ./
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN npm ci --build-from-source=false

# Copy source
COPY . .

# Prisma 7 nécessite une URL au moment du generate
# Dummy URL (pas de connexion réelle)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/dummy"

# Generate Prisma client pour media
RUN npx prisma generate --config apps/media/prisma.config.ts

# Build NestJS media
RUN npm run build:media


# ---------- RUNNER ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Install vips runtime
RUN apk add --no-cache vips

ENV NODE_ENV=production

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=builder /app/dist/apps/media ./dist/apps/media

# Copy Prisma assets
COPY --from=builder /app/apps/media/src/prisma ./src/prisma
COPY --from=builder /app/apps/media/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3050

CMD ["node", "dist/apps/media/apps/media/src/main.js"]
