# Guide de Développement - CESI Collector Shop

## 🚀 Démarrage Rapide (Mode Dev)

### 1. Lancer l'infrastructure et les services

```bash
# Depuis le répertoire cesi-collector-shop/
docker-compose -f docker-compose.dev.yml up -d

# Voir les logs en temps réel
docker-compose -f docker-compose.dev.yml logs -f

# Voir les logs d'un service spécifique
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f auth
```

### 2. Attendre que tout soit prêt

Les services NestJS et le frontend Vite démarrent progressivement :
1. Bases de données PostgreSQL (quelques secondes)
2. Redis, RabbitMQ, MinIO (quelques secondes)
3. npm install + Prisma generate (1-2 minutes)
4. Services backend avec hot reload (quelques secondes)
5. Frontend Vite (quelques secondes)

**Total : 2-3 minutes** pour le premier démarrage, puis **10-20 secondes** pour les redémarrages.

### 3. Migrations et Seeds

#### Première fois seulement :

```bash
# Migrations (créer les tables)
docker-compose -f docker-compose.dev.yml exec auth npx prisma migrate deploy --config apps/auth/prisma.config.ts
docker-compose -f docker-compose.dev.yml exec listing npx prisma migrate deploy --config apps/listing/prisma.config.ts
docker-compose -f docker-compose.dev.yml exec moderation npx prisma migrate deploy --config apps/moderation/prisma.config.ts
docker-compose -f docker-compose.dev.yml exec media npx prisma migrate deploy --config apps/media/prisma.config.ts

# Seeds (données de test)
docker-compose -f docker-compose.dev.yml exec auth node dist/apps/auth/apps/auth/src/seed-runner.js
docker-compose -f docker-compose.dev.yml exec listing node dist/apps/listing/apps/listing/src/seed-runner.js
docker-compose -f docker-compose.dev.yml exec moderation node dist/apps/moderation/apps/moderation/src/seed-runner.js
docker-compose -f docker-compose.dev.yml exec media node dist/apps/media/apps/media/src/seed-runner.js
```

### 4. Accéder à l'application

- **Application** : http://localhost:8080
- **Frontend direct (Vite HMR)** : http://localhost:5173
- **Auth API** : http://localhost:8080/api/auth/get-session
- **RabbitMQ Management** : http://localhost:15672 (user: cesishop, pass: cesishoppassword)
- **MinIO Console** : http://localhost:9001 (user: cesishop, pass: cesishoppassword)

## 🔄 Hot Reload

### Backend (NestJS)
- ✅ Les modifications dans `apps/*/src/**/*.ts` sont automatiquement détectées
- ✅ Le service redémarre automatiquement
- ✅ Pas besoin de rebuild

### Frontend (Vite)
- ✅ Hot Module Replacement (HMR) activé
- ✅ Les modifications sont reflétées instantanément dans le navigateur
- ✅ Pas besoin de refresh manuel

## 🛠️ Commandes Utiles

### Arrêter tout
```bash
docker-compose -f docker-compose.dev.yml down
```

### Arrêter et supprimer les volumes (reset complet)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Redémarrer un service spécifique
```bash
docker-compose -f docker-compose.dev.yml restart auth
docker-compose -f docker-compose.dev.yml restart frontend
```

### Shell dans un container
```bash
docker-compose -f docker-compose.dev.yml exec auth sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

### Voir les logs
```bash
# Tous les services
docker-compose -f docker-compose.dev.yml logs -f

# Service spécifique
docker-compose -f docker-compose.dev.yml logs -f auth
docker-compose -f docker-compose.dev.yml logs -f nginx
```

### Rebuilder après changement de dépendances
```bash
# Supprimer les node_modules volumes et restart
docker-compose -f docker-compose.dev.yml down
docker volume rm cesi-collector-shop_node_modules_auth
docker volume rm cesi-collector-shop_node_modules_frontend
docker-compose -f docker-compose.dev.yml up -d
```

## 🐛 Debugging

### Problème d'authentification / Cookies

**Symptômes** : Redirection vers login après connexion, session non persistée

**Vérifications** :
1. Vérifier que l'URL est bien `http://localhost:8080` (PAS 5173)
2. Ouvrir DevTools > Application > Cookies > http://localhost:8080
3. Vérifier qu'un cookie de session existe (better_auth_session)
4. Vérifier les logs du service auth : `docker-compose -f docker-compose.dev.yml logs -f auth`

**Solution** :
- Utiliser **http://localhost:8080** (via nginx) et PAS http://localhost:5173 (direct Vite)
- Nginx route correctement et gère les cookies/CORS
- Le direct Vite est seulement pour le debug du frontend seul

### Prisma Client pas à jour

```bash
# Regénérer le client Prisma
docker-compose -f docker-compose.dev.yml exec auth npx prisma generate --config apps/auth/prisma.config.ts
docker-compose -f docker-compose.dev.yml restart auth
```

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 8080
lsof -ti:8080 | xargs kill -9

# Ou changer le port dans docker-compose.dev.yml
```

## 📦 Structure des Volumes

Les `node_modules` sont dans des volumes Docker pour :
- ✅ Performances (pas de sync avec le host)
- ✅ Compatibilité (binaires compilés pour Alpine Linux)
- ✅ Isolation

Les sources sont montées en bind mount pour :
- ✅ Hot reload immédiat
- ✅ Édition avec ton IDE local

## 🔐 Comptes de Test (après seed)

### Admin
- Email: `admin@example.com`
- Password: `password123`
- Role: ADMIN

### Seller
- Email: `seller@example.com`
- Password: `password123`
- Role: SELLER

## 📝 Workflow de Développement Recommandé

1. **Lancer Docker Compose Dev**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Ouvrir ton IDE** (VSCode, WebStorm, etc.)
   - Backend : `/Users/alexandrekakal/Desktop/everything/cesi/maalsi/BLOCS/BLOC 3/INDIV/cesi-collector-shop`
   - Frontend : `/Users/alexandrekakal/Desktop/everything/cesi/maalsi/BLOCS/BLOC 3/INDIV/cesi-collector-shop-front`

3. **Faire tes modifications**
   - Le hot reload fonctionne automatiquement

4. **Tester sur** http://localhost:8080

5. **Voir les logs** si besoin
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f auth frontend
   ```

6. **Arrêter proprement**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```
