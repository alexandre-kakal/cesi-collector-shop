#!/bin/bash

# Script de validation avant déploiement
# Usage: ./scripts/validate-setup.sh

set -e

echo "🔍 Validation de la configuration Kubernetes"
echo ""

# Counters
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo "ℹ️  $1"
}

# 1. Check required tools
echo "📦 Vérification des outils requis..."
echo ""

if command -v docker &> /dev/null; then
    success "Docker est installé ($(docker --version))"
else
    error "Docker n'est pas installé"
fi

if command -v kubectl &> /dev/null; then
    success "kubectl est installé ($(kubectl version --client --short 2>/dev/null || kubectl version --client))"
else
    error "kubectl n'est pas installé"
fi

if command -v minikube &> /dev/null; then
    success "Minikube est installé ($(minikube version --short 2>/dev/null || echo 'version inconnue'))"
else
    warning "Minikube n'est pas installé (requis pour le déploiement local)"
fi

echo ""

# 2. Check Kubernetes context
echo "🔧 Vérification du contexte Kubernetes..."
echo ""

if kubectl cluster-info &> /dev/null; then
    success "Connexion au cluster Kubernetes OK"
    info "Contexte actuel: $(kubectl config current-context)"
    info "Cluster: $(kubectl cluster-info | head -n1)"
else
    error "Impossible de se connecter au cluster Kubernetes"
    info "Assurez-vous qu'un cluster est démarré (make minikube-start)"
fi

echo ""

# 3. Check Dockerfiles
echo "🐳 Vérification des Dockerfiles..."
echo ""

for service in auth listing media moderation; do
    if [ -f "Dockerfile.$service" ]; then
        success "Dockerfile.$service existe"
    else
        error "Dockerfile.$service manquant"
    fi
done

echo ""

# 4. Check Kubernetes manifests
echo "☸️  Vérification des manifests Kubernetes..."
echo ""

# Base (secrets.yaml ou secrets.enc.yaml)
for file in namespace.yaml configmap.yaml ingress.yaml; do
    if [ -f "k8s/base/$file" ]; then
        success "k8s/base/$file existe"
    else
        error "k8s/base/$file manquant"
    fi
done
if [ -f "k8s/base/secrets.yaml" ] || [ -f "k8s/base/secrets.enc.yaml" ]; then
    success "k8s/base/secrets.yaml ou secrets.enc.yaml existe"
else
    error "k8s/base/secrets.yaml ou secrets.enc.yaml manquant"
fi

# Apps
for service in auth listing media moderation; do
    if [ -f "k8s/apps/$service.yaml" ]; then
        success "k8s/apps/$service.yaml existe"
    else
        error "k8s/apps/$service.yaml manquant"
    fi
done

# Infrastructure
for file in postgresql-auth.yaml postgresql-listing.yaml postgresql-media.yaml postgresql-moderation.yaml rabbitmq.yaml redis.yaml minio.yaml; do
    if [ -f "k8s/infrastructure/$file" ]; then
        success "k8s/infrastructure/$file existe"
    else
        error "k8s/infrastructure/$file manquant"
    fi
done

echo ""

# 5. Check for default secrets (only if secrets.yaml exists)
echo "🔐 Vérification des secrets..."
echo ""

if [ -f "k8s/base/secrets.yaml" ]; then
    if grep -q "changeme-production-password\|REMPLACER_\|changethis" k8s/base/secrets.yaml 2>/dev/null; then
        warning "Le fichier secrets.yaml contient des valeurs par défaut ou des placeholders"
        info "Pour la production, utilisez de vrais secrets (SOPS: sops --encrypt secrets.yaml > secrets.enc.yaml)"
    fi
    if grep -q "your-super-secret-jwt-key-change-in-production" k8s/base/secrets.yaml 2>/dev/null; then
        warning "JWT_SECRET utilise la valeur par défaut"
        info "Générez un secret sécurisé avec: openssl rand -base64 32"
    fi
else
    info "secrets.yaml absent (OK si vous utilisez secrets.enc.yaml + make sops-decrypt)"
fi

if grep -q "YOUR_REGISTRY" k8s/apps/*.yaml; then
    warning "Des manifests contiennent encore 'YOUR_REGISTRY'"
    info "Remplacez par votre vrai registry Docker"
fi

echo ""

# 6. Check health controller
echo "🏥 Vérification du health controller..."
echo ""

if [ -f "libs/shared/src/health.controller.ts" ]; then
    success "HealthController existe"
else
    error "HealthController manquant"
fi

# Check if exported in index.ts
if grep -q "health.controller" libs/shared/src/index.ts; then
    success "HealthController exporté dans libs/shared"
else
    error "HealthController non exporté dans libs/shared/src/index.ts"
fi

# Check if imported in app modules
for service in auth listing media moderation; do
    if grep -q "HealthController" apps/$service/src/app.module.ts; then
        success "HealthController importé dans $service"
    else
        error "HealthController non importé dans apps/$service/src/app.module.ts"
    fi
done

echo ""

# 7. Check Makefile
echo "📜 Vérification du Makefile..."
echo ""

if [ -f "Makefile" ]; then
    success "Makefile existe"
    if command -v make &> /dev/null; then
        success "make est disponible"
    else
        warning "make n'est pas installé (requis pour les cibles de déploiement)"
    fi
else
    error "Makefile manquant"
fi

echo ""

# 8. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tout est OK ! Vous êtes prêt à déployer !${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Déploiement local: make k8s-local   (ou make help pour toutes les cibles)"
    echo "  2. Production: Lisez docs/DEPLOYMENT.md"
    echo "  3. Avec ArgoCD: make argocd"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) trouvé(s)${NC}"
    echo ""
    echo "Vous pouvez déployer, mais vérifiez les warnings ci-dessus."
    echo "Pour la production, résolvez tous les warnings avant de déployer."
else
    echo -e "${RED}❌ $ERRORS erreur(s) et $WARNINGS warning(s) trouvé(s)${NC}"
    echo ""
    echo "Résolvez les erreurs avant de déployer."
    exit 1
fi

echo ""
