import path from 'path';
import { config } from 'dotenv';

// Charger apps/media/.env quand on lance Prisma depuis la racine du monorepo
config({ path: path.resolve(process.cwd(), 'apps/media/.env') });
config(); // fallback .env à la racine

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: 'src/prisma/migrations',
  },
  datasource: {
    url: process.env.MEDIA_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
