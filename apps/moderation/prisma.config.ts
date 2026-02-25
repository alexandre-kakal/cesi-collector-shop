import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), 'apps/moderation/.env') });
config();

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: 'src/prisma/migrations',
  },
  datasource: {
    url: process.env.MODERATION_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
