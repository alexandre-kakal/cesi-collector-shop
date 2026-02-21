# 🚀 GitHub Actions CI/CD

Configuration CI/CD automatique pour le monorepo CESI Collector Shop avec **path filtering** - chaque workflow ne s'exécute que si son service est modifié.

## 📋 Vue d'ensemble

Chaque microservice a son propre workflow CI/CD indépendant. L’analyse SonarCloud est assurée par **Automatic Analysis** (à chaque push sur la branche par défaut), sans workflow dédié.

| Workflow | Fichier | Déclenché par |
|----------|---------|---------------|
| Auth Service | `ci-auth.yml` | Changements dans `apps/auth/`, `libs/shared/`, `Dockerfile.auth` |
| Listing Service | `ci-listing.yml` | Changements dans `apps/listing/`, `libs/shared/`, `Dockerfile.listing` |
| Media Service | `ci-media.yml` | Changements dans `apps/media/`, `libs/shared/`, `Dockerfile.media` |
| Moderation Service | `ci-moderation.yml` | Changements dans `apps/moderation/`, `libs/shared/`, `Dockerfile.moderation` |

## 🔧 Pipeline par Service

Chaque workflow CI/CD exécute **6 jobs** (lint, test, security, build, update-manifests, notify). **SonarCloud** analyse le repo via **Automatic Analysis** (à chaque push sur la branche par défaut).

```
┌─────────────────────────────────────────────┐
│  1. Lint        2. Test      3. Security    │
│     ↓               ↓             ↓         │
│  ESLint         Unit Tests    npm audit     │
│  Prettier       Integration   Snyk          │
│                 Coverage      Trivy FS      │
└─────────────────────────────────────────────┘
                      ↓
         ┌────────────┴────────────┐
         │   4. Build & Push       │
         │   Docker Image          │
         │   + Trivy Image Scan    │
         └────────────┬────────────┘
                      ↓
         ┌────────────┴────────────┐
         │ 5. Update K8s Manifests │
         │    (GitOps for ArgoCD)  │
         └────────────┬────────────┘
                      ↓
         ┌────────────┴────────────┐
         │  6. Notification        │
         │     (Discord)           │
         └─────────────────────────┘

SonarCloud : Automatic Analysis sur la branche par défaut (pas de workflow CI dédié).
```

## ⚙️ Configuration des Secrets

### Secrets GitHub requis

Allez dans **Settings → Secrets and variables → Actions** et ajoutez :

#### 1. Docker / GitHub Container Registry (GHCR)

Les images sont poussées sur **GitHub Container Registry (ghcr.io)**. Aucun secret n’est requis : le workflow utilise `GITHUB_TOKEN`.

- **Registry** : `ghcr.io`
- **Images** : `ghcr.io/<owner>/cesi-shop-auth`, `cesi-shop-listing`, `cesi-shop-media`, `cesi-shop-moderation`

#### 2. SonarCloud (qualité de code)

Aucun secret GitHub n’est requis pour SonarCloud : l’analyse est faite par **Automatic Analysis** (à chaque push sur la branche par défaut). Configurer le projet sur [sonarcloud.io](https://sonarcloud.io) et lier le repo GitHub ; les analyses se déclenchent automatiquement.

#### 3. Snyk Security

```yaml
SNYK_TOKEN: "your-snyk-api-token"
```

**Comment obtenir :**
1. Créer un compte sur [Snyk.io](https://snyk.io)
2. Account Settings → General → API Token

#### 4. GitHub PAT (Personal Access Token)

```yaml
PAT_TOKEN: "ghp_xxxxxxxxxxxxx"
```

**Pourquoi ?** Pour permettre au workflow de commit les mises à jour des manifests k8s.

**Comment créer :**
1. Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Scopes : `repo` (full control of private repositories)
4. Copier le token

#### 5. Notifications Discord (Optionnel)

```yaml
DISCORD_WEBHOOK: "https://discord.com/api/webhooks/xxx/yyy"
```

**Comment obtenir :**
1. Discord → Paramètres du serveur → Intégrations → Webhooks
2. Créer un webhook et copier l’URL

## 🎯 Fonctionnalités

### ✅ Path Filtering (Optimisation)

Les workflows ne se déclenchent **que** si les fichiers pertinents sont modifiés :

```yaml
on:
  push:
    paths:
      - 'apps/auth/**'          # Code du service
      - 'libs/shared/**'        # Librairies partagées
      - 'package.json'          # Dépendances
      - 'Dockerfile.auth'       # Configuration Docker
```

**Avantage :** Si vous modifiez seulement `apps/auth/`, seul le workflow Auth s'exécute ! ⚡

### ✅ Lint & Format Check

- **ESLint** : Vérification des règles de code
- **Prettier** : Vérification du formatage

```bash
npm run lint
npx prettier --check "apps/auth/**/*.ts"
```

### ✅ Tests Automatisés

- **Unit Tests** : Tests unitaires par service
- **Integration Tests** : Tests d'intégration
- **Coverage** : Rapport de couverture envoyé à Codecov

```bash
npm run test:unit -- --testPathPatterns=apps/auth
npm run test:integration -- --testPathPatterns=apps/auth
npm run test:cov -- --testPathPatterns=apps/auth
```

### ✅ Security Scans

**3 niveaux de sécurité :**

1. **npm audit** - Vulnérabilités des dépendances npm
2. **Snyk** - Analyse approfondie des dépendances
3. **Trivy** - Scanner de vulnérabilités filesystem + images Docker

Les résultats sont uploadés dans **GitHub Security** (Code Scanning Alerts).

### ✅ SonarCloud (Automatic Analysis)

**SonarCloud** analyse le repo via **Automatic Analysis** à chaque push sur la branche par défaut (pas de workflow CI). Qualité du code :
- Code smells
- Bugs potentiels
- Vulnérabilités
- Couverture de tests
- Duplication de code
- Complexité cyclomatique

### ✅ Docker Build Optimisé

- **Multi-platform** : linux/amd64 et linux/arm64
- **Cache layers** : Réutilisation des layers pour builds rapides
- **SBOM** : Software Bill of Materials (liste des composants)
- **Image scanning** : Trivy scan de l'image finale

```yaml
platforms: linux/amd64,linux/arm64
cache-from: type=registry,ref=$IMAGE:buildcache
cache-to: type=registry,ref=$IMAGE:buildcache,mode=max
```

### ✅ GitOps - Mise à jour automatique des manifests

Après le build, le workflow met à jour automatiquement le manifest Kubernetes :

```yaml
# k8s/apps/auth.yaml
image: docker.io/username/cesi-shop-auth:main-abc1234
```

ArgoCD détecte le changement et déploie automatiquement ! 🎉

## 🚦 Workflow selon les branches

### Sur Pull Request

```
PR vers main/develop
    ↓
1. Lint ✓
2. Test ✓
3. Security ✓
(+ SonarQube en parallèle via workflow sonarqube.yml)
    ↓
Résultats dans PR checks
```

**Pas de build Docker ni de déploiement.**

### Sur Push vers `develop`

```
Push vers develop
    ↓
1-3. Lint, Test, Security ✓
4. Build & Push Docker avec tag "develop-abc1234" ✓
5. Update k8s/apps/*.yaml avec le nouveau tag ✓
(SonarCloud : Automatic Analysis sur la branche par défaut)
    ↓
ArgoCD sync vers environnement de staging
```

### Sur Push vers `main` (Production)

```
Push vers main
    ↓
1-3. Lint, Test, Security ✓
4. Build & Push Docker avec tags:
   - main-abc1234
   - latest
   - v1.2.3 (si tag git)
5. Update k8s/apps/*.yaml ✓
6. Notification Discord ✓
(SonarCloud : Automatic Analysis sur la branche par défaut)
    ↓
ArgoCD sync vers production
```

## 📊 Visualisation

### GitHub Actions UI

Allez dans l'onglet **Actions** de votre repo pour voir :
- ✅ Status des workflows
- 📊 Durée d'exécution
- 📝 Logs détaillés
- 🔄 Re-run en cas d'échec

### GitHub Security

Allez dans **Security → Code scanning** pour voir :
- 🔒 Vulnérabilités détectées par Trivy
- 📦 Dépendances à risque
- ⚠️ Severité (Critical, High, Medium, Low)

### SonarCloud Dashboard

Connectez-vous à [SonarCloud.io](https://sonarcloud.io) pour voir (analyse automatique à chaque push sur la branche par défaut) :
- 📈 Évolution de la qualité du code
- 🐛 Bugs à corriger
- 🔥 Code smells
- 📊 Couverture de tests
- 💯 Note globale (A-E)

## 🔄 Exemple de Workflow Complet

```bash
# 1. Créer une branche
git checkout -b feat/add-new-endpoint

# 2. Modifier le code Auth
vim apps/auth/src/auth.controller.ts

# 3. Commit et push
git add .
git commit -m "feat(auth): add new endpoint"
git push origin feat/add-new-endpoint

# 4. GitHub Actions s'exécute automatiquement
# ✅ Lint
# ✅ Tests
# ✅ Security
# ✅ SonarCloud (Automatic Analysis)
# ❌ Pas de build (car c'est une feature branch)

# 5. Créer une Pull Request
gh pr create --title "Add new endpoint" --body "Description"

# 6. Les checks s'affichent dans la PR
# Si tout est vert ✅, merge possible

# 7. Merge vers main
gh pr merge --squash

# 8. GitHub Actions sur main
# ✅ Tous les checks
# ✅ Build Docker → ghcr.io/owner/cesi-shop-auth:main-abc1234
# ✅ Update k8s/apps/auth.yaml
# ✅ Commit et push du manifest
# ✅ Notification Discord

# 9. ArgoCD détecte le changement
# 🚀 Déploiement automatique en production !
```

## 🐛 Troubleshooting

### Workflow ne se déclenche pas

**Cause** : Les chemins modifiés ne matchent pas les `paths` du workflow.

**Solution** : Vérifier que vos changements sont dans les dossiers surveillés :
```yaml
paths:
  - 'apps/auth/**'
  - 'libs/shared/**'
```

### Build Docker échoue

**Causes possibles :**
1. Permissions du `GITHUB_TOKEN` (packages: write)
2. Dockerfile invalide
3. Dépendances manquantes

**Solution** :
```bash
# Tester localement
docker build -f Dockerfile.auth -t test:latest .

# Vérifier les permissions du repo (Settings → Actions → General)
# Workflow permissions : Read and write
```

### SonarCloud quality gate failed

**Cause** : Code ne respecte pas les standards de qualité.

**Solution** :
1. Voir le rapport sur SonarCloud.io
2. Corriger les issues
3. Re-push

### Trivy trouve des vulnérabilités

**Cause** : Dépendances ou base image avec CVE.

**Solution** :
```bash
# Mettre à jour les dépendances
npm update
npm audit fix

# Scanner localement
trivy image your-image:latest
```

### PAT_TOKEN ne fonctionne pas

**Cause** : Token expiré ou permissions insuffisantes.

**Solution** :
1. Régénérer un PAT avec scope `repo`
2. Mettre à jour le secret GitHub

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [SonarQube Scanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [Snyk GitHub Actions](https://github.com/snyk/actions)
- [Trivy](https://github.com/aquasecurity/trivy)

## 🎓 Best Practices

1. ✅ **Toujours tester localement** avant de push
2. ✅ **Utiliser des feature branches** pour le développement
3. ✅ **Créer des PR** plutôt que push direct sur main
4. ✅ **Vérifier les Security Alerts** régulièrement
5. ✅ **Maintenir la couverture de tests** > 80%
6. ✅ **Corriger les issues SonarCloud** rapidement
7. ✅ **Utiliser semantic versioning** pour les tags
8. ✅ **Monitorer les durées de build** et optimiser si > 10min

---

**Happy CI/CD! 🚀**
