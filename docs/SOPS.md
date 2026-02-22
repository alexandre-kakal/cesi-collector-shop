# Secrets avec SOPS + age

Les secrets Kubernetes sont chiffrés dans le repo avec **SOPS** et **age**. Seuls les détenteurs de la clé privée (vous, ArgoCD) peuvent les déchiffrer.

---

## Prérequis

```bash
brew install sops age
```

---

## Mise en place (une fois)

### 1. Clé age

```bash
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
grep "public key:" ~/.config/sops/age/keys.txt
```

Copier la clé **publique** dans `.sops.yaml` à la racine (remplacer la valeur `age:`). Ne jamais committer la clé privée.

### 2. Fichier des secrets

```bash
cp k8s/base/secrets.example.yaml k8s/base/secrets.yaml
# Éditer k8s/base/secrets.yaml avec vos valeurs
sops --encrypt k8s/base/secrets.yaml > k8s/base/secrets.enc.yaml
```

Committer `secrets.enc.yaml` et `.sops.yaml`. Ne jamais committer `secrets.yaml` (déjà dans `.gitignore`).

---

## Utilisation

| Contexte | Commande |
|----------|----------|
| Déchiffrer en local (pour `make k8s-apply`) | `make sops-decrypt` ou `sops -d k8s/base/secrets.enc.yaml > k8s/base/secrets.yaml` |
| Chiffrer après modification | `sops --encrypt k8s/base/secrets.yaml > k8s/base/secrets.enc.yaml` |
| Éditer le fichier chiffré | `sops k8s/base/secrets.enc.yaml` |

---

## ArgoCD

Pour qu’ArgoCD déchiffre au sync :

1. **Secret avec la clé privée**  
   `kubectl create secret generic age-key-secret -n argocd --from-file=age.key=$HOME/.config/sops/age/keys.txt`

2. **Plugin SOPS** dans la ConfigMap `argocd-cm` (voir `k8s/argocd/configmanagementplugin-sops.yaml`).

3. **Repo server** : avoir **sops** et **age** installés, monter le secret, définir `SOPS_AGE_KEY_FILE` (ex. `/tmp/age/age.key`). Détails : [k8s/argocd/README-SOPS.md](../k8s/argocd/README-SOPS.md).

4. Redémarrer : `kubectl rollout restart deployment argocd-repo-server -n argocd`.

L’application `cesi-shop-base` utilise déjà le plugin `sops` dans `k8s/argocd/applications/base.yaml`.
