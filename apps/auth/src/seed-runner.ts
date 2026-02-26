/**
 * Point d'entrée dédié au seed — à lancer séparément de l'API (ex. Job K8s).
 * Ne pas appeler depuis main.ts pour éviter que plusieurs pods exécutent le seed en parallèle.
 *
 * Usage : node dist/apps/auth/seed-runner.js
 *        ou npm run seed:auth (dev)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './prisma/seed.service';

async function bootstrap() {
  process.env.DATABASE_URL = process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });
  const seed = app.get(SeedService);
  await seed.run();
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
