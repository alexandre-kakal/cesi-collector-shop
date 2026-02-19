FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:listing

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/apps/listing ./dist/apps/listing
COPY --from=builder /app/apps/listing/src/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 3020
CMD ["node", "dist/apps/listing/main"]
