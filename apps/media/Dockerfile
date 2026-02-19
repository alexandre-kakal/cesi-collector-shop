FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ vips-dev
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:media

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache vips
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/apps/media ./dist/apps/media
COPY --from=builder /app/apps/media/src/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 3050
CMD ["node", "dist/apps/media/main"]
