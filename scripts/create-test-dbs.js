#!/usr/bin/env node
/**
 * Crée les bases de données de test sur chaque instance PostgreSQL.
 * Prérequis: docker-compose up -d (postgres-auth, postgres-listing, etc.)
 * Usage: node scripts/create-test-dbs.js
 */

const { Client } = require('pg');

function toPostgresUrl(url, defaultUrl) {
  if (!url) return defaultUrl;
  return url.replace(/\/([^/?]+)(\?|$)/, '/postgres$2');
}

const configs = [
  { name: 'auth_db_test', url: toPostgresUrl(process.env.AUTH_DATABASE_URL, 'postgresql://auth_user:auth_password@localhost:5432/postgres') },
  { name: 'listing_db_test', url: toPostgresUrl(process.env.LISTING_DATABASE_URL, 'postgresql://listing_user:listing_password@localhost:5433/postgres') },
  { name: 'moderation_db_test', url: toPostgresUrl(process.env.MODERATION_DATABASE_URL, 'postgresql://moderation_user:moderation_password@localhost:5434/postgres') },
  { name: 'media_db_test', url: toPostgresUrl(process.env.MEDIA_DATABASE_URL, 'postgresql://media_user:media_password@localhost:5435/postgres') },
];

async function createDb(client, dbName) {
  const res = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (res.rows.length > 0) {
    console.log(`  DB ${dbName} existe déjà.`);
    return;
  }
  await client.query(`CREATE DATABASE "${dbName}"`);
  console.log(`  DB ${dbName} créée.`);
}

async function main() {
  console.log('Création des bases de test...\n');

  for (const cfg of configs) {
    const client = new Client({ connectionString: cfg.url });
    try {
      await client.connect();
      await createDb(client, cfg.name);
    } catch (err) {
      console.error(`Erreur pour ${cfg.name}:`, err.message);
    } finally {
      await client.end();
    }
  }

  console.log('\nTerminé.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
