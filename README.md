# 🛍️ CESI Collector Shop

Plateforme de marketplace de collectionneurs construite avec NestJS, déployée sur Kubernetes avec ArgoCD.

## 🏗️ Architecture

Cette plateforme est composée de **4 microservices NestJS** communiquant via RabbitMQ:

### Microservices

| Service | Port | Description | Technologies |
|---------|------|-------------|--------------|
| **Auth** | 3010 | Authentification & autorisation | JWT, Bcrypt, Redis |
| **Listing** | 3020 | Gestion des annonces | Prisma, PostgreSQL |
| **Media** | 3050 | Stockage et traitement d'images | MinIO, Sharp |
| **Moderation** | 3030 | Modération des contenus | Prisma, PostgreSQL |

### Infrastructure

- **PostgreSQL** (x4) - Base de données par service
- **RabbitMQ** - Message broker pour communication asynchrone
- **Redis** - Cache et gestion de sessions
- **MinIO** - Stockage objet S3-compatible
- **Ingress NGINX** - Reverse proxy et load balancing

## 🚀 Démarrage Rapide

### Option 1: Développement Local

```bash
# 1. Setup automatique complet (Makefile)
make k8s-local

# 2. Ajouter à /etc/hosts
echo "$(minikube ip) cesi-shop.local" | sudo tee -a /etc/hosts

# 3. Lancer le tunnel (Minikube)
minikube tunnel

# 4. Tester
curl http://cesi-shop.local/api/auth/health
```

### Option 2: Production avec ArgoCD

```bash
# 1. Valider la configuration
make validate

# 2. Build et push des images
make build-images REGISTRY=your-registry.io/cesi-shop TAG=v1.0.0

# 3. Déployer avec ArgoCD
make argocd
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Index de la documentation |
| [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md) | Démarrer le projet (local, prod, ArgoCD) |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Déploiement, troubleshooting |
| [docs/CHECKLIST.md](./docs/CHECKLIST.md) | Checklist avant déploiement |
| [k8s/README.md](./k8s/README.md) | Documentation Kubernetes détaillée |
| [.github/SETUP.md](./.github/SETUP.md) | ⭐ Setup GitHub Actions CI/CD |
| [.github/workflows/README.md](./.github/workflows/README.md) | Documentation des workflows |

## 📁 Structure du Projet

```
cesi-collector-shop/
├── apps/                          # Microservices NestJS
│   ├── auth/                      # Service d'authentification
│   ├── listing/                   # Service d'annonces
│   ├── media/                     # Service de médias
│   └── moderation/                # Service de modération
├── libs/                          # Librairies partagées
│   └── shared/                    # Code commun
├── k8s/                           # Configuration Kubernetes
│   ├── apps/                      # Déploiements des microservices
│   ├── infrastructure/            # PostgreSQL, RabbitMQ, Redis, MinIO
│   ├── base/                      # ConfigMaps, Secrets, Ingress
│   ├── argocd/                    # Configuration ArgoCD
│   └── local/                     # Configuration pour développement local
├── scripts/                       # Scripts utilitaires
│   ├── validate-setup.sh          # Validation (make validate)
│   ├── test-setup.js             # Setup tests
│   └── create-test-dbs.js        # Création BDD de test
├── Makefile                       # Cibles déploiement (make help)
├── Dockerfile.*                   # Dockerfiles par service
└── README.md                      # Ce fichier
```

## 🛠️ Prérequis

### Développement

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Minikube](https://minikube.sigs.k8s.io/)
- [Helm 3](https://helm.sh/) (optionnel, pour le monitoring)

### CI/CD (GitHub Actions)

- Repository GitHub
- Secrets configurés (voir [.github/SETUP.md](./.github/SETUP.md))
- Docker Registry (Docker Hub, GHCR, GCR, etc.)
- (Optionnel) SonarQube, Snyk, Slack

### Production

- Cluster Kubernetes (GKE, EKS, AKS, etc.)
- Docker Registry
- [ArgoCD](https://argo-cd.readthedocs.io/) (Recommandé pour GitOps)

## 💻 Développement Local (Sans Kubernetes)

```bash
# Installer les dépendances
npm install

# Générer les clients Prisma
npm run prisma:generate:auth
npm run prisma:generate:listing
npm run prisma:generate:media
npm run prisma:generate:moderation

# Démarrer tous les services
npm run start:all:dev

# Ou individuellement
npm run start:auth:dev
npm run start:listing:dev
npm run start:media:dev
npm run start:moderation:dev
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tous les tests
npm run test:all

# Coverage
npm run test:cov
```

## 🐳 Docker

### Build des images

```bash
# Build toutes les images (Makefile)
make build-images REGISTRY=your-registry TAG=latest

# Ou individuellement
docker build -f Dockerfile.auth -t cesi-shop-auth:latest .
docker build -f Dockerfile.listing -t cesi-shop-listing:latest .
docker build -f Dockerfile.media -t cesi-shop-media:latest .
docker build -f Dockerfile.moderation -t cesi-shop-moderation:latest .
```

## ☸️ Kubernetes

### Validation

```bash
# Valider la configuration avant déploiement
make validate
```

### Déploiement Local

```bash
# Setup complet automatique (Minikube + build + déploiement)
make k8s-local

# Ou étape par étape : make minikube-start && make minikube-load && make k8s-apply
```

### Déploiement Production

```bash
# Déploiement manuel (sans overlay Kustomize)
make k8s-deploy

# Avec ArgoCD (GitOps)
make argocd
```

### Vérification

```bash
# Voir tous les pods
kubectl get pods -n cesi-shop

# Voir les services
kubectl get svc -n cesi-shop

# Voir l'ingress
kubectl get ingress -n cesi-shop

# Logs d'un service
kubectl logs -f deployment/auth-service -n cesi-shop
```

## 🌐 URLs des Services

### APIs (via Ingress)

- Auth: `http://cesi-shop.local/api/auth`
- Listings: `http://cesi-shop.local/api/listings`
- Media: `http://cesi-shop.local/api/media`
- Moderation: `http://cesi-shop.local/api/moderation`

### Management

- RabbitMQ: `http://cesi-shop.local/rabbitmq` (guest/guest)
- MinIO: `http://cesi-shop.local/minio` (minioadmin/minioadmin123)
- Grafana: `https://grafana.cesi-shop.local` ou `http://localhost:3000` (admin/admin) – après `make monitoring-install`

### Health Checks

- `GET /health` - Disponible sur chaque service

## 🔐 Sécurité

### Secrets par Défaut (À CHANGER EN PRODUCTION !)

Les fichiers de configuration contiennent des secrets par défaut **uniquement pour le développement**.

**Pour la production:**

1. Créer `k8s/base/secrets.prod.yaml` (git-ignoré)
2. Générer des secrets sécurisés:
   ```bash
   # JWT Secret
   openssl rand -base64 32

   # Passwords
   openssl rand -base64 24
   ```
3. OU utiliser Sealed Secrets / External Secrets Operator

⚠️ **Ne jamais committer de vrais secrets dans Git !**

## 🔄 Workflow GitOps avec ArgoCD + GitHub Actions

### Automatique (Recommandé) 🤖

```bash
# 1. Faire des changements dans le code
vim apps/auth/src/auth.controller.ts

# 2. Commit et push
git add .
git commit -m "feat: add new endpoint"
git push

# 3. GitHub Actions s'exécute automatiquement:
#    ✅ Lint, Tests, Security, SonarQube
#    ✅ Build et push l'image Docker
#    ✅ Met à jour k8s/apps/auth.yaml
#    ✅ Commit le manifest

# 4. ArgoCD détecte et déploie automatiquement ! 🎉
```

### Manuel (Make)

```bash
# 1. Build et push nouvelle version
make build-images REGISTRY=your-registry.io/cesi-shop TAG=v1.0.1

# 2. Mettre à jour le manifest
sed -i '' 's/:v1.0.0/:v1.0.1/g' k8s/apps/auth.yaml

# 3. Commit et push
git add .
git commit -m "feat: update auth service to v1.0.1"
git push
```

## 📊 Monitoring (Optionnel)

Stack Prometheus + Grafana avec dashboards pré-provisionnés (CPU, RAM, Disk par pod).

### Installation

**Prérequis:** Helm 3 (`brew install helm`)

```bash
# 1. Installer le stack (Prometheus, Grafana, Node Exporter, kube-state-metrics)
make monitoring-install

# 2a. Accès rapide via port-forward
make monitoring-ui
# Ouvrir http://localhost:3000  |  admin / admin

# 2b. OU via Ingress (après make certs)
make monitoring-ingress
# Ajouter à /etc/hosts: $(minikube ip) grafana.cesi-shop.local
# Grafana: https://grafana.cesi-shop.local  |  admin / admin
```

> **Note Ingress:** Si les certificats ont été générés avant l’ajout de `grafana.cesi-shop.local`, régénérer avec `rm k8s/certs/cesi-shop.local.* && make certs`.

### Dashboards inclus

- **315 - cAdvisor** : CPU, RAM, filesystem par container
- **6417 - Node Exporter** : CPU, RAM, disk au niveau du nœud
- **6418 - Node Exporter Disks** : détails par disque
- **6419 - kube-state-metrics** : pods, deployments, réplicas

### Composants déployés

- Prometheus, Grafana, kube-state-metrics, Node Exporter (namespace `monitoring`)
- Les métriques sont collectées automatiquement via cAdvisor (kubelet) – aucune modification des apps requise

## 🆘 Troubleshooting

### Les pods ne démarrent pas

```bash
# Voir les détails
kubectl describe pod <pod-name> -n cesi-shop

# Voir les logs
kubectl logs <pod-name> -n cesi-shop

# Voir les événements
kubectl get events -n cesi-shop --sort-by='.lastTimestamp'
```

### Cannot connect to database

```bash
# Vérifier PostgreSQL
kubectl get pods -l app=postgres-auth -n cesi-shop

# Tester la connexion
kubectl exec -it deployment/postgres-auth -n cesi-shop -- psql -U cesishop -d auth -c "SELECT 1;"
```

### Ingress ne fonctionne pas

```bash
# Vérifier l'ingress controller
kubectl get pods -n ingress-nginx

# Minikube: Vérifier l'addon
minikube addons list | grep ingress

# Lancer le tunnel (Minikube)
minikube tunnel
```

Plus de détails dans [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#dépannage)

## 🧹 Nettoyage

```bash
# Supprimer tout
kubectl delete namespace cesi-shop

# Supprimer le cluster local
minikube delete
# OU
kind delete cluster --name cesi-shop
```

## 📖 Ressources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'feat: add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT.

## 👥 Auteurs

- **CESI Students** - *Projet MAALSI*

## 🙏 Remerciements

- NestJS pour le framework
- Kubernetes pour l'orchestration
- ArgoCD pour le GitOps
- La communauté open-source

---

**Bon déploiement ! 🚀**
