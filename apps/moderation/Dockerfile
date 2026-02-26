# ---------- BUILDER ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Prisma 7 nécessite une URL au moment du generate
# Dummy URL (pas de connexion réelle)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/dummy"

# Generate Prisma client pour moderation
RUN npx prisma generate --config apps/moderation/prisma.config.ts

# Build NestJS moderation
RUN npm run build:moderation


# ---------- RUNNER ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=builder /app/dist/apps/moderation ./dist/apps/moderation

# Copy Prisma assets
COPY --from=builder /app/apps/moderation/src/prisma ./src/prisma
COPY --from=builder /app/apps/moderation/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3030

CMD ["node", "dist/apps/moderation/apps/moderation/src/main.js"]
