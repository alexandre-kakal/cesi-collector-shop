# CESI Collector Shop - Kubernetes & ArgoCD Deployment

Ce dossier contient tous les manifests Kubernetes et la configuration ArgoCD pour déployer la plateforme CESI Collector Shop.

## 📁 Structure

```
k8s/
├── base/                      # Configurations de base
│   ├── namespace.yaml        # Namespace cesi-shop
│   ├── configmap.yaml        # Variables d'environnement
│   ├── secrets.example.yaml  # Template des secrets (commité)
│   ├── secrets.enc.yaml      # Secrets chiffrés SOPS (commité)
│   ├── secrets.yaml          # Secrets en clair (jamais commité ; généré par sops -d)
│   ├── kustomization.yaml    # Kustomize base (utilisé par ArgoCD + SOPS)
│   └── ingress.yaml          # Ingress pour l'accès externe
├── infrastructure/            # Services externes
│   ├── postgresql-auth.yaml
│   ├── postgresql-listing.yaml
│   ├── postgresql-media.yaml
│   ├── postgresql-moderation.yaml
│   ├── rabbitmq.yaml
│   ├── redis.yaml
│   └── minio.yaml
├── apps/                      # Microservices
│   ├── auth.yaml
│   ├── listing.yaml
│   ├── media.yaml
│   └── moderation.yaml
└── argocd/                    # Configuration ArgoCD
    ├── project.yaml
    └── applications/
        ├── base.yaml
        ├── infrastructure.yaml
        └── apps.yaml
```

## 🚀 Déploiement

### Démarrage rapide (local + ArgoCD + SOPS)

**Pour lancer le projet en local avec ArgoCD et la gestion des secrets SOPS**, suis le guide pas à pas :

👉 **[docs/GETTING-STARTED.md](../docs/GETTING-STARTED.md)**

Toutes les commandes passent par le **Makefile** (Minikube uniquement) : `make help` pour la liste des cibles, `make k8s-local` pour tout déployer en local.

### Prérequis

- Cluster Kubernetes (Minikube, Kind, K3s, GKE, EKS, AKS, etc.)
- `kubectl` configuré
- (Optionnel) ArgoCD installé
- Docker registry pour stocker les images

### Option 1: Déploiement Manuel avec kubectl

#### 1. Construire et pousser les images Docker

```bash
# Avec Make (depuis la racine du projet)
make build-images REGISTRY=your-registry.io/cesi-shop TAG=latest

# Les images seront:
# - your-registry.io/cesi-shop/auth:latest
# - your-registry.io/cesi-shop/listing:latest
# - your-registry.io/cesi-shop/media:latest
# - your-registry.io/cesi-shop/moderation:latest
```

#### 2. Mettre à jour les manifests

Modifier les fichiers dans `k8s/apps/*.yaml` pour remplacer `YOUR_REGISTRY` par votre registry:

```yaml
image: your-registry.io/cesi-shop/auth:latest
```

#### 3. Configurer les secrets (SOPS)

Les secrets sont gérés avec **SOPS + age** (chiffrés dans le repo). Voir **docs/SOPS.md** pour la procédure.

Résumé :
1. Copier `k8s/base/secrets.example.yaml` vers `k8s/base/secrets.yaml`
2. Remplir les valeurs, puis chiffrer : `sops --encrypt k8s/base/secrets.yaml > k8s/base/secrets.enc.yaml`
3. Committer `secrets.enc.yaml` (jamais `secrets.yaml`)

#### 4. Déployer sur Kubernetes

```bash
# Avec Make (déploiement direct, sans Kustomize overlay)
make k8s-deploy

# Ou manuellement:
kubectl apply -f k8s/base/
kubectl apply -f k8s/infrastructure/
kubectl apply -f k8s/apps/
```

### Option 2: Déploiement GitOps avec ArgoCD

#### 1. Installer ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Récupérer le mot de passe admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

#### 2. Accéder à l'UI ArgoCD

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Ouvrir: https://localhost:8080
# Username: admin
# Password: (obtenu à l'étape précédente)
```

#### 3. Mettre à jour les applications ArgoCD

Modifier `k8s/argocd/applications/*.yaml` avec votre URL de repo Git:

```yaml
source:
  repoURL: https://github.com/YOUR_USERNAME/cesi-collector-shop.git
```

#### 4. Déployer avec ArgoCD

```bash
make argocd   # installe ArgoCD + crée les applications

# Ou manuellement:
# kubectl apply -f k8s/argocd/project.yaml
# kubectl apply -f k8s/argocd/applications/
```

ArgoCD va automatiquement:
- Synchroniser le repo Git
- Déployer les manifests
- Gérer les mises à jour automatiques
- Auto-heal en cas de drift

## 🔍 Vérification du déploiement

```bash
# Vérifier les pods
kubectl get pods -n cesi-shop

# Vérifier les services
kubectl get svc -n cesi-shop

# Vérifier l'ingress
kubectl get ingress -n cesi-shop

# Voir les logs d'un service
kubectl logs -f deployment/auth-service -n cesi-shop

# Voir les événements
kubectl get events -n cesi-shop --sort-by='.lastTimestamp'
```

## 🌐 Accès aux services

### Via Ingress (Production)

Configurer votre DNS pour pointer vers l'IP de votre Ingress Controller:

```bash
kubectl get ingress -n cesi-shop
```

Services disponibles:
- `http://cesi-shop.local/api/auth` - Service Auth
- `http://cesi-shop.local/api/listings` - Service Listing
- `http://cesi-shop.local/api/media` - Service Media
- `http://cesi-shop.local/api/moderation` - Service Moderation
- `http://cesi-shop.local/rabbitmq` - RabbitMQ Management
- `http://cesi-shop.local/minio` - MinIO Console

### Via Port-Forward (Développement)

```bash
# Auth service
kubectl port-forward svc/auth-service -n cesi-shop 3010:3010

# Listing service
kubectl port-forward svc/listing-service -n cesi-shop 3020:3020

# Media service
kubectl port-forward svc/media-service -n cesi-shop 3050:3050

# Moderation service
kubectl port-forward svc/moderation-service -n cesi-shop 3030:3030

# RabbitMQ Management
kubectl port-forward svc/rabbitmq -n cesi-shop 15672:15672

# MinIO Console
kubectl port-forward svc/minio -n cesi-shop 9001:9001
```

## 🔧 Configuration

### Variables d'environnement

Modifier `k8s/base/configmap.yaml` pour ajuster:
- Ports des services
- URLs de connexion
- Configuration MinIO

### Secrets (SOPS + age)

**⚠️ Les secrets sont chiffrés avec SOPS + age** ; seul le fichier `secrets.enc.yaml` est commité.

- **Guide** : [docs/SOPS.md](../docs/SOPS.md)
- En local : `sops -d k8s/base/secrets.enc.yaml > k8s/base/secrets.yaml` avant `kustomize build` ou `kubectl apply -k`
- ArgoCD déchiffre automatiquement via le ConfigManagementPlugin `sops` (voir `k8s/argocd/configmanagementplugin-sops.yaml`)

## 📊 Monitoring

### Health Checks

Tous les services ont des liveness et readiness probes sur `/health`:

```bash
# Tester le health check
kubectl exec -it deployment/auth-service -n cesi-shop -- curl localhost:3010/health
```

### Logs

```bash
# Voir tous les logs du namespace
kubectl logs -l app -n cesi-shop --tail=100 -f

# Logs d'un service spécifique
kubectl logs -f deployment/auth-service -n cesi-shop

# Logs avec stern (outil externe)
stern -n cesi-shop auth
```

## 🔄 Mises à jour

### Mise à jour d'une image

```bash
# Construire et pousser la nouvelle version
make build-images REGISTRY=your-registry.io/cesi-shop TAG=v1.2.3

# Mettre à jour le deployment (si pas ArgoCD)
kubectl set image deployment/auth-service auth=your-registry.io/cesi-shop/auth:v1.2.3 -n cesi-shop

# Avec ArgoCD, simplement commit et push le changement dans Git
```

### Rolling Update

Les déploiements sont configurés pour faire des rolling updates automatiquement.

### Rollback

```bash
# Voir l'historique
kubectl rollout history deployment/auth-service -n cesi-shop

# Rollback
kubectl rollout undo deployment/auth-service -n cesi-shop
```

## 🗑️ Nettoyage

```bash
# Supprimer tout
kubectl delete namespace cesi-shop

# Ou sélectivement
kubectl delete -f k8s/apps/
kubectl delete -f k8s/infrastructure/
kubectl delete -f k8s/base/
```

## 🔐 Sécurité

### Bonnes pratiques

1. **Secrets**: Utiliser un gestionnaire de secrets externe
2. **RBAC**: Créer des ServiceAccounts avec permissions minimales
3. **Network Policies**: Isoler les communications entre services
4. **Pod Security**: Activer Pod Security Standards
5. **Images**: Scanner les images avec Trivy/Snyk
6. **TLS**: Activer TLS pour l'Ingress (Let's Encrypt)

### Exemple de Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-netpol
  namespace: cesi-shop
spec:
  podSelector:
    matchLabels:
      app: auth-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 3010
```

## 📚 Ressources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🆘 Troubleshooting

### Les pods ne démarrent pas

```bash
# Voir les événements
kubectl describe pod <pod-name> -n cesi-shop

# Voir les logs
kubectl logs <pod-name> -n cesi-shop

# Vérifier les ressources
kubectl top pods -n cesi-shop
```

### Base de données inaccessible

```bash
# Vérifier que PostgreSQL est prêt
kubectl get pods -l app=postgres-auth -n cesi-shop

# Tester la connexion
kubectl exec -it deployment/postgres-auth -n cesi-shop -- psql -U cesishop -d auth -c "SELECT 1;"
```

### RabbitMQ ne fonctionne pas

```bash
# Vérifier le statut
kubectl exec -it deployment/rabbitmq -n cesi-shop -- rabbitmq-diagnostics status

# Accéder au management
kubectl port-forward svc/rabbitmq -n cesi-shop 15672:15672
# Ouvrir: http://localhost:15672 (guest/guest)
```
