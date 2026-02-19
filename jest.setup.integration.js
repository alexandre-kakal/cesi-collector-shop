/**
 * Chargé uniquement pour les tests d'intégration.
 * Charge .env.test pour pointer les URLs DB vers les bases de test.
 * Injecte JWT_PUBLIC_KEY / JWT_PRIVATE_KEY depuis test/keys si non définis (RS256 attendu par les apps).
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

const keysDir = path.resolve(process.cwd(), 'test', 'keys');
if (!process.env.JWT_PUBLIC_KEY) {
  const pubPath = path.join(keysDir, 'test-public.pem');
  if (fs.existsSync(pubPath)) {
    process.env.JWT_PUBLIC_KEY = fs.readFileSync(pubPath, 'utf8').replace(/\n/g, '\\n');
  }
}
if (!process.env.JWT_PRIVATE_KEY) {
  const privPath = path.join(keysDir, 'test-private.pem');
  if (fs.existsSync(privPath)) {
    process.env.JWT_PRIVATE_KEY = fs.readFileSync(privPath, 'utf8').replace(/\n/g, '\\n');
  }
}
