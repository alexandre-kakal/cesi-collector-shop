#!/usr/bin/env node
/**
 * Configure l'environnement de test: crée les DB de test et applique les migrations.
 * Prérequis: .env.test présent (copier depuis .env.test.example), docker-compose up -d
 * Usage: node scripts/test-setup.js
 */

const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');

// Charger .env.test
const envTestPath = path.join(root, '.env.test');
dotenv.config({ path: envTestPath });

const env = {
  ...process.env,
  AUTH_DATABASE_URL: process.env.AUTH_DATABASE_URL || 'postgresql://auth_user:auth_password@localhost:5432/auth_db_test?schema=public',
  LISTING_DATABASE_URL: process.env.LISTING_DATABASE_URL || 'postgresql://listing_user:listing_password@localhost:5433/listing_db_test?schema=public',
  MODERATION_DATABASE_URL: process.env.MODERATION_DATABASE_URL || 'postgresql://moderation_user:moderation_password@localhost:5434/moderation_db_test?schema=public',
  MEDIA_DATABASE_URL: process.env.MEDIA_DATABASE_URL || 'postgresql://media_user:media_password@localhost:5435/media_db_test?schema=public',
};

console.log('1. Création des bases de test...');
execSync('node scripts/create-test-dbs.js', { cwd: root, stdio: 'inherit', env });

console.log('\n2. Migrations Prisma (auth, listing, moderation, media)...');
const apps = ['auth', 'listing', 'moderation', 'media'];
for (const app of apps) {
  console.log(`   Migrate ${app}...`);
  execSync(`npx prisma migrate deploy --config apps/${app}/prisma.config.ts`, {
    cwd: root,
    stdio: 'inherit',
    env,
  });
}

console.log('\nSetup terminé. Vous pouvez lancer: npm run test:integration');
