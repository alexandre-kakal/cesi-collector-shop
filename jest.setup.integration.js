/**
 * Chargé uniquement pour les tests d'intégration.
 * Charge .env.test pour pointer les URLs DB vers les bases de test.
 * Définit JWT_SECRET si non défini (HS256).
 */
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
}
