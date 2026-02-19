FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:auth

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/apps/auth ./dist/apps/auth
COPY --from=builder /app/apps/auth/src/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 3010
CMD ["node", "dist/apps/auth/main"]
