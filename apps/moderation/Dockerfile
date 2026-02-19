FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:moderation

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/apps/moderation ./dist/apps/moderation
COPY --from=builder /app/apps/moderation/src/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 3030
CMD ["node", "dist/apps/moderation/main"]
