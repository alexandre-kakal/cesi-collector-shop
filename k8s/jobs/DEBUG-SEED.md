# Debug Jobs de seed bloqués

Exécuter dans l’ordre et noter les sorties.

## 1. Pods des Jobs
```bash
kubectl get pods -n cesi-shop -l job-name=seed-auth -o wide
kubectl get pods -n cesi-shop | grep seed
```

## 2. Quel container est en cours ?
```bash
POD=$(kubectl get pods -n cesi-shop -l job-name=seed-auth -o jsonpath='{.items[0].metadata.name}')
echo "Pod: $POD"
kubectl describe pod "$POD" -n cesi-shop | tail -50
```

## 3. Logs de chaque container (seed-auth)
```bash
POD=$(kubectl get pods -n cesi-shop -l job-name=seed-auth -o jsonpath='{.items[0].metadata.name}')

echo "=== wait-for-postgres ==="
kubectl logs "$POD" -n cesi-shop -c wait-for-postgres --tail=30

echo "=== prisma-migrate ==="
kubectl logs "$POD" -n cesi-shop -c prisma-migrate --tail=50

echo "=== seed ==="
kubectl logs "$POD" -n cesi-shop -c seed --tail=50
```

## 4. Postgres et secrets
```bash
kubectl get svc -n cesi-shop | grep postgres
kubectl get secret database-secrets -n cesi-shop -o jsonpath='{.data.AUTH_DATABASE_URL}' | base64 -d; echo
```

## Causes fréquentes

- **Bloqué sur `wait-for-postgres`** : Postgres pas encore joignable (service/postgres-auth ou pod pas prêt).
- **Bloqué sur `prisma-migrate`** : URL de la DB incorrecte, mot de passe faux, ou Prisma qui tourne dans le mauvais répertoire (CWD).
- **Bloqué sur `seed`** : Connexion DB qui timeout, ou erreur non affichée (vérifier les logs ci‑dessus).
