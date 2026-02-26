/**
 * Script K6 - Cesi Collector Shop
 * Stress test destiné à Minikube (https://cesi-shop.local)
 *
 * Usage:
 *   make k6
 *   k6 run k6-load-test.js
 *   BASE_URL=http://localhost:8080 k6 run k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://cesi-shop.local';

// Options pour certificat auto-signé (Minikube)
const TLS_OPTS = { insecureSkipTLSVerify: true };

// Comptes seed (voir apps/auth/prisma/seed.service.ts)
const BUYER = {
  email: 'buyer@collector-shop.local',
  password: 'Password123!',
};
const SELLER = {
  email: 'seller@collector-shop.local',
  password: 'Password123!',
};

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __VU % 2 === 0 ? BUYER.email : SELLER.email,
      password: __VU % 2 === 0 ? BUYER.password : SELLER.password,
    }),
    { headers: { 'Content-Type': 'application/json' }, ...TLS_OPTS }
  );

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });

  const token = loginRes.json('tokens.accessToken');

  // 2. GET /api/v1/listings (public)
  const listingsRes = http.get(`${BASE_URL}/api/v1/listings`, TLS_OPTS);
  check(listingsRes, {
    'listings status 200': (r) => r.status === 200,
  });

  // 3. GET /api/v1/categories (public)
  const categoriesRes = http.get(`${BASE_URL}/api/v1/categories`, TLS_OPTS);
  check(categoriesRes, {
    'categories status 200': (r) => r.status === 200,
  });

  // 4. GET /api/auth/me (auth)
  const meRes = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    ...TLS_OPTS,
  });
  check(meRes, {
    'me status 200': (r) => r.status === 200,
  });

  sleep(0.5 + Math.random());
}
