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
    
    # Generate Prisma client pour auth
    RUN npx prisma generate --config apps/auth/prisma.config.ts
    
    # Build NestJS auth
    RUN npm run build:auth
    
    
    # ---------- RUNNER ----------
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    # Install production deps only
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Copy build output (Nest monorepo: dist/apps/auth/apps/auth/src/)
    COPY --from=builder /app/dist ./dist
    
    # Copy Prisma assets
    COPY --from=builder /app/apps/auth/src/prisma ./src/prisma
    COPY --from=builder /app/apps/auth/prisma.config.ts ./prisma.config.ts
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
    
    EXPOSE 3010
    
    CMD ["node", "dist/apps/auth/apps/auth/src/main.js"]