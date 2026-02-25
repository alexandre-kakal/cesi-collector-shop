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

# Generate Prisma client pour listing
RUN npx prisma generate --config apps/listing/prisma.config.ts

# Build NestJS listing
RUN npm run build:listing


# ---------- RUNNER ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=builder /app/dist/apps/listing ./dist/apps/listing

# Copy Prisma assets
COPY --from=builder /app/apps/listing/src/prisma ./src/prisma
COPY --from=builder /app/apps/listing/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3020

CMD ["node", "dist/apps/listing/apps/listing/src/main.js"]
