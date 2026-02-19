# Tests — CESI Collector Shop

## Vue d’ensemble

- **Tests unitaires** : `*.spec.ts` — mocks (Prisma, RabbitMQ, Minio, etc.), pas de DB.
- **Tests d’intégration** : `*.integration-spec.ts` — vraie DB de test (PostgreSQL), migrations appliquées.

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run test` | Tous les tests (unit + integration) |
| `npm run test:unit` | Uniquement les tests unitaires |
| `npm run test:integration` | Uniquement les tests d’intégration (nécessite `test:setup`) |
| `npm run test:setup` | Crée les DB de test et applique les migrations Prisma |
| `npm run test:ci` | `test:setup` puis `test:unit` puis `test:integration` |
| `npm run test:watch` | Mode watch (tous les tests) |
| `npm run test:cov` | Rapport de couverture |

## Prérequis pour les tests d’intégration

1. **PostgreSQL** : les 4 instances doivent tourner (même config que le dev), par exemple :
   ```bash
   docker-compose up -d postgres-auth postgres-listing postgres-moderation postgres-media
   ```

2. **Fichier `.env.test`** à la racine (copier depuis `.env.test.example`) :
   ```bash
   cp .env.test.example .env.test
   ```
   Les URLs doivent pointer vers les bases **de test** (`*_db_test`).

3. **Setup une fois** (création des DB + migrations) :
   ```bash
   npm run test:setup
   ```

Ensuite vous pouvez lancer les tests d’intégration autant de fois que nécessaire :
```bash
npm run test:integration
```

## CI / pipeline

Pour une exécution type CI (DB déjà up, par ex. via docker-compose) :

```bash
# 1) Créer les DB de test et appliquer les migrations
npm run test:setup

# 2) Lancer tous les tests
npm run test:all
```

Ou en une commande (setup + tests) :

```bash
npm run test:ci
```

## Structure des tests

- **Unit** : un fichier `*.spec.ts` à côté (ou dans le même dossier) du fichier testé.  
  Ex. : `category.service.spec.ts` pour `category.service.ts`.
- **Integration** : un fichier `*.integration-spec.ts` dans le même module.  
  Ex. : `category.integration-spec.ts` pour le module category avec une vraie DB.

Les tests d’intégration utilisent `Test.createTestingModule()` avec `PrismaModule` (et éventuellement `ConfigModule` avec `.env.test`) et une base dédiée pour ne pas toucher au dev.

## Exemples présents

- **Listing** : `category.service.spec.ts`, `category.integration-spec.ts`, `listing.service.spec.ts`
- **Moderation** : `moderation.service.spec.ts`
- **Media** : `media.service.spec.ts`

Vous pouvez dupliquer ces patterns pour les autres services (auth, etc.).
