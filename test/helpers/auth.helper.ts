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

/** Load JWT secret for signing test tokens (HS256). */
function getTestJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  throw new Error(
    'JWT_SECRET not set. Copy .env.test.example to .env.test and set JWT_SECRET, or run the project from repo root.',
  );
}

export function generateTestToken(user: TestUser, expiresIn: string | number = '1h'): string {
  const secret = getTestJwtSecret();
  const jwtService = new JwtService({
    secret,
    signOptions: { algorithm: 'HS256' as const },
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
