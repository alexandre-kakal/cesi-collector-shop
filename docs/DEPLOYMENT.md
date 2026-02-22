# Guide de déploiement

## Architecture

- **Microservices** : Auth (3010), Listing (3020), Media (3050), Moderation (3030) — NestJS.
- **Infra** : 4× PostgreSQL, RabbitMQ, Redis, MinIO.
- **Réseau** : Ingress NGINX, Services ClusterIP.

---

## Prérequis

- **Local** : Docker, kubectl, Minikube, make. Optionnel : SOPS, age.
- **Production** : Cluster K8s, registry Docker, kubectl configuré.

---

## Déploiement local (Minikube)

```bash
make k8s-local
```

Ou étape par étape : `make minikube-start` → `make sops-decrypt` (si SOPS) → `make minikube-load` → `make k8s-apply`.

Vérification : `make k8s-status`. Accès : ajouter `$(minikube ip) cesi-shop.local` dans `/etc/hosts`, puis `minikube tunnel`.

---

## Déploiement production (sans ArgoCD)

1. Build et push des images : `make build-images REGISTRY=your-registry.io/cesi-shop TAG=v1.0.0`
2. Mettre à jour les images dans `k8s/apps/*.yaml`.
3. Configurer les secrets (fichier ou SOPS) et le ConfigMap.
4. Déployer : `make k8s-deploy`.

---

## ArgoCD (GitOps)

```bash
make argocd
make argocd-password   # mot de passe admin
make argocd-ui         # https://localhost:8080
```

- Modifier l’URL du repo dans `k8s/argocd/applications/*.yaml` (remplacer `YOUR_USERNAME`).
- Si repo privé : configurer les credentials dans l’UI ArgoCD.
- Avec SOPS : configurer le CMP et la clé age sur le repo server — voir [SOPS.md](./SOPS.md) et [k8s/argocd/README-SOPS.md](../k8s/argocd/README-SOPS.md).

Applications : `cesi-shop-base`, `cesi-shop-infrastructure`, `cesi-shop-apps`. Sync depuis l’UI ou `argocd app sync <name>`.

---

## CI et tags de version

- **Local** : le Kustomize `k8s/` utilise le tag **dev** (et `localhost:32770`) pour éviter `:latest` : avec un tag fixe, Kubernetes met par défaut `imagePullPolicy: IfNotPresent`. Faire `make build-images && make minikube-load` (TAG=dev par défaut). Un patch force aussi `imagePullPolicy: IfNotPresent` si tu overrides avec `TAG=latest`.
- **Production** : la CI (`.github/workflows/ci-*.yml`) build avec un **tag de version** (ex. `$GITHUB_SHA`). Les jobs **update-manifests** (actuellement commentés) sont prévus pour mettre à jour `k8s/apps/*.yaml` avec ce tag après le build, puis commit + push. ArgoCD sync et déploie la nouvelle image. Avec un tag de version (et non `:latest`), Kubernetes utilise par défaut `imagePullPolicy: IfNotPresent`. Pour activer : décommenter le job `update-manifests` dans chaque workflow et configurer un `PAT_TOKEN` pour le push.

---

## Vérification

```bash
kubectl get pods -n cesi-shop
kubectl get svc -n cesi-shop
kubectl logs -f deployment/auth-service -n cesi-shop
```

---

## Pourquoi « localhost » dans le nom des images ?

En local, les manifests pointent vers des images du type `localhost:32770/cesi-shop-auth:latest`. Ce n'est pas une URL de téléchargement magique :

- **Avec `make minikube-load`** : les images sont **chargées directement** dans le moteur de conteneurs de Minikube. Le nom complet (y compris `localhost:32770`) est juste le **tag** sous lequel l'image est enregistrée. Kubernetes utilise ce même nom pour retrouver l'image déjà présente sur le nœud — il ne fait pas de pull vers une machine.
- **Avec le registry addon Minikube** : le registre tourne dans le cluster (souvent sur le port 32770 côté host). On pousse en `localhost:32770/...` depuis la machine, et le cluster peut tirer les images depuis ce registre. Le `localhost:32770` est alors l'adresse du registre pour ton environnement local.

En **production**, on utilise un vrai registre (ex. `ghcr.io/mon-org/cesi-shop-auth:v1.0.0`) : plus de localhost, les noms d'images viennent de la CI et des manifests mis à jour par les jobs `update-manifests`.

---

## Dépannage

### Pods en Init:Error (auth, listing, media, moderation)

L'init échoue souvent pour : (1) **Secrets absents** — faire `make sops-decrypt` et vérifier `kubectl get secret database-secrets -n cesi-shop`. (2) **Postgres pas prêts** — vérifier `kubectl get pods -n cesi-shop -l app=postgres-auth`. (3) **Image pas à jour** — après modification des Dockerfiles (ex. Prisma), refaire `make build-images && make minikube-load && make k8s-apply`. (4) **Voir l'erreur** : `POD=$(kubectl get pods -n cesi-shop -l app=auth-service -o jsonpath='{.items[0].metadata.name}')` puis `kubectl logs $POD -n cesi-shop -c prisma-migrate --tail=100` et `kubectl describe pod $POD -n cesi-shop`.

| Problème | Piste |
|----------|--------|
| Pods en CrashLoopBackOff | `kubectl describe pod <name> -n cesi-shop` et `kubectl logs <pod> -n cesi-shop` |
| ImagePullBackOff | Nom d'image (localhost:32770 si registry addon) et patch imagePullPolicy: IfNotPresent après minikube-load d’image et les pull secrets |
| Base inaccessible | Vérifier que les pods PostgreSQL sont Ready et les secrets (DB URL) |
| ArgoCD ne sync pas | Vérifier l’URL du repo, les credentials, et les logs du repo server |

Commandes utiles : `kubectl get events -n cesi-shop --sort-by='.lastTimestamp'`, `kubectl describe deployment <name> -n cesi-shop`.

---

## Commandes utiles

```bash
# Rollout
kubectl rollout status deployment/auth-service -n cesi-shop
kubectl rollout undo deployment/auth-service -n cesi-shop

# Minikube
minikube dashboard
minikube tunnel
```

Plus de détails : [k8s/README.md](../k8s/README.md).
