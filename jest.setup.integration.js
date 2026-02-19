/**
 * Chargé uniquement pour les tests d'intégration.
 * Charge .env.test pour pointer les URLs DB vers les bases de test.
 */
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });
