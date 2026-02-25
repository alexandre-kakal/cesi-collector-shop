#!/usr/bin/env bash
# Génère un certificat SSL local pour cesi-shop.local
# Usage: ./generate.sh  ou  make certs

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="cesi-shop.local"
DOMAINS="cesi-shop.local grafana.cesi-shop.local"
CRT="$SCRIPT_DIR/${DOMAIN}.crt"
KEY="$SCRIPT_DIR/${DOMAIN}.key"

if [ -f "$CRT" ] && [ -f "$KEY" ]; then
  echo "✅ Certificat existant trouvé ($CRT)"
  exit 0
fi

mkdir -p "$SCRIPT_DIR"

if command -v mkcert &>/dev/null; then
  echo "🔐 Génération avec mkcert (certificat fiable par l'OS)..."
  cd "$SCRIPT_DIR"
  mkcert -key-file "$KEY" -cert-file "$CRT" $DOMAINS
  echo "✅ Certificat créé: $CRT"
else
  echo "🔐 Génération avec OpenSSL (certificat auto-signé)..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY" -out "$CRT" \
    -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:cesi-shop.local,DNS:grafana.cesi-shop.local,DNS:localhost"
  echo "✅ Certificat créé: $CRT"
  echo "⚠️  Auto-signé: le navigateur affichera un avertissement. Installez mkcert pour des certs fiables."
fi
