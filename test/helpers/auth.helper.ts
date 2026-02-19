import * as path from 'path';
import * as fs from 'fs';
import { JwtService } from '@nestjs/jwt';
import { Role, JwtPayload } from '@app/shared';

export interface TestUser {
  id: string;
  email: string;
  role: Role;
  password: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  BUYER: {
    id: 'buyer-test-id',
    email: 'buyer@test.com',
    role: Role.BUYER,
    password: 'password123',
  },
  SELLER: {
    id: 'seller-test-id',
    email: 'seller@test.com',
    role: Role.SELLER,
    password: 'password123',
  },
  SELLER_2: {
    id: 'seller-2-test-id',
    email: 'seller2@test.com',
    role: Role.SELLER,
    password: 'password123',
  },
  ADMIN: {
    id: 'admin-test-id',
    email: 'admin@test.com',
    role: Role.ADMIN,
    password: 'password123',
  },
};

/** Load JWT private key for signing test tokens (RS256). Apps verify with JWT_PUBLIC_KEY. */
function getTestPrivateKey(): string {
  const fromEnv = process.env.JWT_PRIVATE_KEY;
  if (fromEnv) return fromEnv.replace(/\\n/g, '\n');
  const keyPath = path.resolve(process.cwd(), 'test', 'keys', 'test-private.pem');
  if (fs.existsSync(keyPath)) return fs.readFileSync(keyPath, 'utf8');
  throw new Error(
    'JWT_PRIVATE_KEY not set and test/keys/test-private.pem not found. Copy .env.test.example to .env.test and set JWT keys, or run the project from repo root.',
  );
}

export function generateTestToken(user: TestUser, expiresIn: string | number = '1h'): string {
  const privateKey = getTestPrivateKey();
  const jwtService = new JwtService({
    privateKey,
    signOptions: { algorithm: 'RS256' as const },
  });

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwtService.sign(payload, { expiresIn } as any);
}

export function generateExpiredToken(user: TestUser): string {
  return generateTestToken(user, '-1h');
}

export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export function getBuyerToken(): string {
  return generateTestToken(TEST_USERS.BUYER);
}

export function getSellerToken(): string {
  return generateTestToken(TEST_USERS.SELLER);
}

export function getSeller2Token(): string {
  return generateTestToken(TEST_USERS.SELLER_2);
}

export function getAdminToken(): string {
  return generateTestToken(TEST_USERS.ADMIN);
}
