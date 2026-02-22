# Checklist de déploiement

## Avant de commencer

- [ ] `npm run build:auth` (idem listing, media, moderation) — OK
- [ ] `npm run test:unit` et `npm run test:integration` — OK
- [ ] Docker, kubectl, Minikube installés
- [ ] `make validate` — pas d’erreur

---

## Déploiement local

- [ ] Secrets : `secrets.enc.yaml` + `make sops-decrypt`
- [ ] `make k8s-local` (ou `make minikube-start` puis `make minikube-load` puis `make k8s-apply`)
- [ ] `make k8s-status` — pods Running
- [ ] `/etc/hosts` : `$(minikube ip) cesi-shop.local`
- [ ] `minikube tunnel` puis test : `curl http://cesi-shop.local/api/auth/health`

---

## Déploiement production (sans ArgoCD)

- [ ] Secrets et ConfigMap configurés
- [ ] `make build-images REGISTRY=... TAG=...` et push
- [ ] Images mises à jour dans `k8s/apps/*.yaml`
- [ ] `make k8s-deploy`
- [ ] `kubectl get pods -n cesi-shop` — tous Ready
- [ ] DNS / Ingress configuré

---

## ArgoCD

- [ ] Repo Git à jour (et `secrets.enc.yaml` si SOPS)
- [ ] URL du repo dans `k8s/argocd/applications/*.yaml`
- [ ] `make argocd`
- [ ] Si SOPS : clé age dans le cluster, CMP et repo server configurés (voir [SOPS.md](./SOPS.md))
- [ ] Sync des 3 applications dans l’UI (https://localhost:8080 après `make argocd-ui`)
