# Jobs de seed (production)

Les seeds **ne doivent pas** être exécutés par les pods de l’API au démarrage. Si plusieurs replicas tournent, ils partagent la même base : tous feraient le seed en parallèle (risque de conflits et d’exécutions inutiles).

## Bonne pratique : Job Kubernetes

Exécuter le seed **une seule fois** via un **Job** K8s :

1. **Même image** que le service (auth, listing, media, moderation).
2. **Init container** : chaque Job attend que son Postgres soit joignable (`nc -z postgres-<service> 5432`) avant de lancer le seed.
3. **Commande** : `node dist/apps/<service>/apps/<service>/src/seed-runner.js` (point d’entrée dédié au seed).
4. **Completions : 1** → un seul pod qui exécute le seed puis se termine.

Ordre recommandé (dépendances EXT entre services) :

```bash
kubectl apply -f k8s/jobs/seed-auth-job.yaml
kubectl apply -f k8s/jobs/seed-media-job.yaml
kubectl apply -f k8s/jobs/seed-listing-job.yaml
kubectl apply -f k8s/jobs/seed-moderation-job.yaml
```

Vérifier qu’un Job a réussi :

```bash
kubectl get jobs -n cesi-shop
kubectl logs job/seed-auth -n cesi-shop
```

Les manifests utilisent `YOUR_REGISTRY/cesi-shop-*:latest` : à remplacer par votre registry et tag d’image (comme dans les Deployments).

## En local / dev

En local, lancer les seeds après les migrations :

```bash
npm run seed:all
# ou par service :
npm run seed:auth
npm run seed:media
npm run seed:listing
npm run seed:moderation
```

Ces scripts buildent l’app puis exécutent le seed-runner (même chemin que dans les Jobs ci-dessus).
