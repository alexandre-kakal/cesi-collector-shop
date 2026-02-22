# Configuration ArgoCD pour SOPS

Ce dossier contient la configuration permettant à ArgoCD de déchiffrer les secrets SOPS lors du sync.

## Fichiers

- **configmanagementplugin-sops.yaml** : définition du plugin à ajouter dans la ConfigMap `argocd-cm`.
- **applications/base.yaml** : l’Application `cesi-shop-base` utilise le plugin `sops` pour le path `k8s/base`.

## Prérequis sur le repo server ArgoCD

Le **repo server** ArgoCD doit :

1. **Avoir `sops` et `age` installés**  
   - Soit une image custom dérivée de `quay.io/argoproj/argocd` avec `sops` et `age` installés.  
   - Soit un init container qui les installe dans un volume partagé.

2. **Avoir accès à la clé privée age**  
   - Créer un Secret dans le namespace `argocd` :
     ```bash
     kubectl create secret generic age-key-secret -n argocd \
       --from-file=age.key=$HOME/.config/sops/age/keys.txt
     ```
   - Monter ce Secret dans le deployment du **repo server** (pas l’application server), par exemple :
     - Volume : `age-key` → `secret/age-key-secret`
     - Mount : `/tmp/age/age.key` (readOnly: true)
   - Définir la variable d’environnement sur le repo server : `SOPS_AGE_KEY_FILE=/tmp/age/age.key`

3. **Déclarer le plugin dans `argocd-cm`**  
   - `kubectl edit configmap argocd-cm -n argocd`  
   - Ajouter le bloc `configManagementPlugins` décrit dans `configmanagementplugin-sops.yaml`.

## Exemple de patch pour le deployment repo server (Kustomize)

Si vous gérez ArgoCD avec Kustomize, vous pouvez patcher le deployment du repo server ainsi (à adapter selon votre installation) :

```yaml
# patch-repo-server-sops.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: SOPS_AGE_KEY_FILE
              value: /tmp/age/age.key
          volumeMounts:
            - name: age-key
              mountPath: /tmp/age
              readOnly: true
      volumes:
        - name: age-key
          secret:
            secretName: age-key-secret
```

Pour une installation standard avec le manifeste officiel ArgoCD, le nom du deployment est en général `argocd-repo-server` dans le namespace `argocd`. Sur un cluster managé (ex. Scaleway Kapsule), vous pouvez appliquer ce patch après avoir installé ArgoCD.

**Note :** L’image par défaut du repo server ne contient pas `sops` ni `age`. Il faut soit construire une image custom (voir docs/SOPS.md et ce README), soit utiliser une image communautaire qui les inclut.

## Vérification

Après configuration :

1. L’Application `cesi-shop-base` doit utiliser le plugin `sops` (déjà configuré dans `applications/base.yaml`).
2. Au prochain sync, ArgoCD exécutera le CMP : déchiffrement de `secrets.enc.yaml` puis `kustomize build`.
3. En cas d’échec, vérifier les logs du repo server : `kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server`.

Voir **docs/SOPS.md** pour le guide.
