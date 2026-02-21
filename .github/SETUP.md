# 🔧 Setup GitHub Actions - Guide Rapide

Guide étape par étape pour configurer la CI/CD sur votre repository GitHub.

## ⚡ Setup Rapide (5 minutes)

### 1. Configurer les Secrets GitHub

Allez dans **Settings → Secrets and variables → Actions → New repository secret**

#### Secrets Minimum (Obligatoires)

Les images Docker sont poussées sur **GitHub Container Registry (ghcr.io)**. Aucun secret Docker n’est requis : le workflow utilise `GITHUB_TOKEN`.

```bash
# GitHub PAT (pour commit auto des manifests k8s)
PAT_TOKEN = "ghp_xxxxxxxxxxxxx"
```

#### Secrets Optionnels (mais recommandés)

```bash
# SonarCloud : analyse via Automatic Analysis (à chaque push sur la branche par défaut).
# Aucun secret GitHub requis pour SonarCloud.

# Snyk
SNYK_TOKEN = "your-snyk-token"

# Discord (notifications CI/CD)
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/xxx/yyy"
```

---

## 📋 Détails par Secret

### 1. Docker / GitHub Container Registry (GHCR)

Les workflows poussent les images sur **ghcr.io** (GitHub Container Registry). Aucune configuration supplémentaire n’est nécessaire :

- **Registry** : `ghcr.io`
- **Authentification** : `GITHUB_TOKEN` (fourni automatiquement par GitHub Actions)
- **Images** : `ghcr.io/<owner>/cesi-shop-auth`, `cesi-shop-listing`, `cesi-shop-media`, `cesi-shop-moderation` (avec `<owner>` en minuscules)

### 2. GitHub PAT (Personal Access Token)

**Obligatoire** pour que le workflow puisse commit les manifests k8s.

1. Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Nom: `CESI_SHOP_CI`
4. Expiration: 90 jours (ou No expiration)
5. Scopes: ✅ `repo` (Full control)
6. Generate token
7. Copier le token `ghp_xxxxxxxxxxxxx`

```yaml
PAT_TOKEN: 'ghp_xxxxxxxxxxxxx'
```

### 3. SonarCloud (Qualité de code)

L’analyse est faite par **Automatic Analysis** (à chaque push sur la branche par défaut). Aucun secret GitHub n’est nécessaire.

1. Aller sur [sonarcloud.io](https://sonarcloud.io)
2. Se connecter avec GitHub
3. Créer une organisation et un projet, puis lier le repo GitHub
4. Activer **Automatic Analysis** pour la branche par défaut

Les rapports s’affichent sur SonarCloud après chaque push.

### 4. Snyk (Sécurité)

**Optionnel** pour les scans de sécurité avancés.

1. Aller sur [snyk.io](https://snyk.io)
2. Sign up with GitHub
3. Account Settings → General → API Token
4. Copier le token

```yaml
SNYK_TOKEN: 'xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx'
```

### 5. Notifications Discord

**Optionnel** pour recevoir les résultats CI/CD sur Discord.

1. Ouvrir Discord → Paramètres du serveur → Intégrations → Webhooks
2. Créer un webhook (ou « Nouveau Webhook »)
3. Choisir le salon et copier l’URL du webhook

```yaml
DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/123456789/xxxxxxxxxxxxx'
```

---

## 🧪 Tester la Configuration

### Test 1: Vérifier les secrets

```bash
gh secret list

# Au minimum:
# PAT_TOKEN
# (optionnel: SNYK_TOKEN, DISCORD_WEBHOOK)
```

### Test 2: Trigger un workflow manuellement

1. Aller dans **Actions**
2. Choisir un workflow (ex: CI/CD - Auth Service)
3. Run workflow → Run workflow

### Test 3: Push un changement

```bash
# Modifier un fichier
echo "// test" >> apps/auth/src/main.ts

# Commit et push
git add .
git commit -m "test: trigger CI"
git push

# Aller dans Actions → voir le workflow s'exécuter
```

---

## 🎯 Configuration Minimale (Sans Snyk)

Si vous voulez juste build et déployer sans les scans avancés:

### Secrets requis uniquement:

```yaml
PAT_TOKEN: 'ghp_xxxxx'
```

### Modifier les workflows:

Commenter le job `security` dans les 4 workflows si besoin :

```yaml
# jobs:
#   security:    # Commenter tout ce job
```

---

## 🔐 Sécurité des Secrets

### ✅ Bonnes pratiques

1. **Ne jamais** commit les secrets dans Git
2. **Utiliser** des tokens avec expiration
3. **Limiter** les permissions au strict nécessaire
4. **Régénérer** les tokens régulièrement
5. **Supprimer** les tokens inutilisés

### ❌ Mauvaises pratiques

- Partager les tokens par email / Discord
- Utiliser le même token pour plusieurs projets
- Tokens sans expiration
- Permissions trop larges (`admin`)

---

## 📊 Vérification Post-Setup

Après la configuration, vérifiez:

### ✅ Checklist

- [ ] Tous les secrets sont configurés
- [ ] Un workflow s'est exécuté avec succès
- [ ] Les images Docker sont pushées sur le registry
- [ ] Les manifests k8s sont mis à jour automatiquement
- [ ] (Optionnel) SonarCloud affiche les projets
- [ ] (Optionnel) GitHub Security affiche les scans
- [ ] (Optionnel) Discord reçoit les notifications

### 🎉 Si tout est ✅

Votre CI/CD est opérationnelle ! 🚀

**Workflow:**

```
Push code → Tests → Build → Push image → Update k8s → ArgoCD deploy
```

---

## 🐛 Problèmes Courants

### "Error: Invalid credentials" (Docker / GHCR)

**Cause:** Problème d’accès au GitHub Container Registry.

**Solution:**

1. Vérifier que le workflow a bien les permissions `contents: read` et `packages: write`
2. Pour un repo organisation, s’assurer que les actions sont autorisées et que le `GITHUB_TOKEN` peut écrire dans les packages

### "Error: Resource not accessible by integration"

**Cause:** `PAT_TOKEN` n'a pas les bonnes permissions.

**Solution:**

1. Régénérer un PAT avec scope `repo`
2. Mettre à jour le secret

### "SonarCloud n’affiche pas les analyses"

**Cause:** L’analyse est faite par Automatic Analysis (pas de workflow CI). Vérifier sur [sonarcloud.io](https://sonarcloud.io) que le repo est bien lié et que l’Automatic Analysis est activée pour la branche par défaut.

### "Workflow doesn't trigger"

**Cause:** Aucun fichier modifié ne match les `paths`.

**Solution:**
Modifier un fichier dans le bon dossier:

```bash
echo "test" >> apps/auth/src/main.ts
git add . && git commit -m "test" && git push
```

---

## 📞 Support

- **GitHub Actions**: [docs.github.com/en/actions](https://docs.github.com/en/actions)
- **Docker Hub**: [docs.docker.com](https://docs.docker.com)
- **SonarCloud**: [sonarcloud.io/documentation](https://sonarcloud.io/documentation)
- **Snyk**: [docs.snyk.io](https://docs.snyk.io)

---

**Temps estimé de setup**: 5-10 minutes ⏱️

**Prêt à automatiser ? Let's go! 🚀**
