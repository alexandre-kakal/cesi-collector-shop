# CESI Collector Shop - Makefile (Minikube local)
# Usage: make <cible>  ex: make minikube-start  make k8s-local

# Minikube registry addon (docker driver) utilise souvent le port 32770 au lieu de 5000
REGISTRY ?= localhost:32770
# En local : éviter :latest (K8s met imagePullPolicy: Always) → utiliser un tag (ex. dev) pour IfNotPresent par défaut
TAG ?= dev
NAMESPACE = cesi-shop

.PHONY: help minikube-start minikube-status build-images minikube-load \
	sops-decrypt k8s-apply k8s-delete k8s-status k8s-local k8s-local-start \
	argocd-install argocd-apps argocd argocd-password argocd-ui \
	k8s-deploy validate

# ─────────────────────────────────────────────
# Aide
# ─────────────────────────────────────────────
help:
	@echo "CESI Collector Shop - Cibles Make (Minikube)"
	@echo ""
	@echo "Cluster:"
	@echo "  minikube-start     Démarrer Minikube (cpus=4, mem=8G, ingress, registry)"
	@echo "  minikube-status   Vérifier le statut Minikube"
	@echo ""
	@echo "Images:"
	@echo "  build-images      Construire les images Docker (REGISTRY=$(REGISTRY) TAG=$(TAG))"
	@echo "  minikube-load     Charger les images dans Minikube"
	@echo ""
	@echo "Secrets (SOPS):"
	@echo "  sops-decrypt      Déchiffrer secrets.enc.yaml -> secrets.yaml (clé: SOPS_AGE_KEY_FILE ou ~/.config/sops/age/keys.txt)"
	@echo ""
	@echo "Déploiement local (Kustomize k8s/):"
	@echo "  k8s-apply         Appliquer les manifests (après make minikube-load si images locales)"
	@echo "  k8s-delete        Supprimer les ressources déployées"
	@echo "  k8s-status       Afficher pods/svc du namespace $(NAMESPACE)"
	@echo "  k8s-local         Tout en un: sops-decrypt + minikube-start + build + load + k8s-apply"
	@echo "  k8s-local-start   Redémarrer le déploiement (minikube + sops-decrypt + k8s-apply, sans rebuild images)"
	@echo ""
	@echo "ArgoCD:"
	@echo "  argocd-install    Installer ArgoCD dans le cluster"
	@echo "  argocd-apps       Créer le projet et les applications ArgoCD"
	@echo "  argocd            argocd-install + argocd-apps"
	@echo "  argocd-password   Afficher le mot de passe admin ArgoCD"
	@echo "  argocd-ui         Lancer port-forward vers l'UI ArgoCD (https://localhost:8080)"
	@echo ""
	@echo "Déploiement direct (sans Kustomize):"
	@echo "  k8s-deploy        kubectl apply base + infrastructure + apps + ingress"
	@echo ""
	@echo "Validation:"
	@echo "  validate          Vérifier outils, manifests, secrets"
	@echo ""
	@echo "Variables: REGISTRY=$(REGISTRY)  TAG=$(TAG)"

# ─────────────────────────────────────────────
# Minikube
# ─────────────────────────────────────────────
minikube-start:
	@echo "📦 Starting Minikube..."
	minikube start --cpus=4 --memory=5000 --disk-size=20g --driver=docker
	minikube addons enable ingress
	minikube addons enable registry
	@echo "✅ Minikube started. Useful: minikube dashboard, minikube tunnel"

minikube-status:
	minikube status

# ─────────────────────────────────────────────
# Images Docker
# ─────────────────────────────────────────────
build-images:
	@echo "🔨 Building Docker images $(REGISTRY) tag=$(TAG)..."
	docker build -f Dockerfile.auth -t cesi-shop-auth:$(TAG) .
	docker build -f Dockerfile.listing -t cesi-shop-listing:$(TAG) .
	docker build -f Dockerfile.media -t cesi-shop-media:$(TAG) .
	docker build -f Dockerfile.moderation -t cesi-shop-moderation:$(TAG) .
	@echo "✅ Backend images built."

build-frontend:
	@echo "🔨 Building frontend (VITE_API_URL=http://cesi-shop.local)..."
	docker build -f ../cesi-collector-shop-front/Dockerfile \
		--build-arg VITE_API_URL=http://cesi-shop.local \
		-t cesi-shop-frontend:$(TAG) ../cesi-collector-shop-front/
	@echo "✅ Frontend image built."

build-all: build-images build-frontend

minikube-load: build-all
	@echo "📤 Loading images into Minikube..."
	minikube image load cesi-shop-auth:$(TAG)
	minikube image load cesi-shop-listing:$(TAG)
	minikube image load cesi-shop-media:$(TAG)
	minikube image load cesi-shop-moderation:$(TAG)
	minikube image load cesi-shop-frontend:$(TAG)
	@echo "✅ Images loaded."

# ─────────────────────────────────────────────
# SOPS (secrets)
# ─────────────────────────────────────────────
SOPS_AGE_KEY_FILE ?= $(HOME)/.config/sops/age/keys.txt
sops-decrypt:
	@echo "🔓 Decrypting secrets..."
	@if [ ! -f "$(SOPS_AGE_KEY_FILE)" ]; then echo "❌ Clé age introuvable: $(SOPS_AGE_KEY_FILE). Créez-la avec: age-keygen -o $(SOPS_AGE_KEY_FILE)"; exit 1; fi
	SOPS_AGE_KEY_FILE="$(SOPS_AGE_KEY_FILE)" sops -d k8s/base/secrets.enc.yaml > k8s/base/secrets.yaml
	@echo "✅ k8s/base/secrets.yaml created (gitignored)."

# ─────────────────────────────────────────────
# Déploiement Kustomize (k8s/)
# ─────────────────────────────────────────────
k8s-apply:
	@if [ -f k8s/base/secrets.enc.yaml ]; then $(MAKE) sops-decrypt; fi
	@echo "🚀 Deploying to cluster (kustomize k8s/)..."
	kubectl apply -k k8s/
	@echo "✅ Deployed. Check: make k8s-status"

k8s-delete:
	kubectl delete -k k8s/ --ignore-not-found
	@echo "✅ Resources deleted."

k8s-status:
	@echo "Pods:"
	kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "Services:"
	kubectl get svc -n $(NAMESPACE)

k8s-local: minikube-start minikube-load
	@echo "🚀 Deploying to Minikube..."
	kubectl apply -k k8s/
	@echo "✅ Local setup complete. make k8s-status  |  Add to /etc/hosts: $$(minikube ip) cesi-shop.local"

k8s-local-start:
	@echo "▶ Starting Minikube (if needed)..."
	@minikube status >/dev/null 2>&1 || $(MAKE) minikube-start
	@if [ -f k8s/base/secrets.enc.yaml ]; then $(MAKE) sops-decrypt; fi
	@echo "🚀 Applying manifests..."
	kubectl apply -k k8s/
	@echo "✅ Local setup started. make k8s-status  |  Add to /etc/hosts: $$(minikube ip) cesi-shop.local"

# ─────────────────────────────────────────────
# ArgoCD
# ─────────────────────────────────────────────
argocd-install:
	@echo "🔱 Installing ArgoCD..."
	kubectl create namespace argocd 2>/dev/null || true
	kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s
	@echo "✅ ArgoCD installed. Get password: make argocd-password"

argocd-apps:
	@echo "📋 Creating ArgoCD project and applications..."
	kubectl apply -f k8s/argocd/project.yaml
	kubectl apply -f k8s/argocd/applications/base.yaml
	kubectl apply -f k8s/argocd/applications/infrastructure.yaml
	kubectl apply -f k8s/argocd/applications/apps.yaml
	@echo "✅ ArgoCD applications created."

argocd: argocd-install argocd-apps

argocd-password:
	@kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo

argocd-ui:
	@echo "🌐 ArgoCD UI: https://localhost:8080 (admin / make argocd-password)"
	kubectl port-forward svc/argocd-server -n argocd 8080:443

# ─────────────────────────────────────────────
# Déploiement direct (sans Kustomize overlay)
# ─────────────────────────────────────────────
k8s-deploy:
	@echo "🚀 Deploying (base + infrastructure + apps + ingress)..."
	kubectl apply -f k8s/base/namespace.yaml
	kubectl apply -f k8s/base/configmap.yaml
	kubectl apply -f k8s/base/secrets.yaml
	kubectl apply -f k8s/infrastructure/
	kubectl wait --for=condition=ready pod -l app=postgres-auth -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=postgres-listing -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=postgres-media -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=postgres-moderation -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=rabbitmq -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=redis -n $(NAMESPACE) --timeout=300s || true
	kubectl wait --for=condition=ready pod -l app=minio -n $(NAMESPACE) --timeout=300s || true
	kubectl apply -f k8s/apps/
	kubectl apply -f k8s/base/ingress.yaml
	@echo "✅ Deployment complete."

# ─────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────
validate:
	./scripts/validate-setup.sh
