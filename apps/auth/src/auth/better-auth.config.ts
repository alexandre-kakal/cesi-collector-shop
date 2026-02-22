import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import * as path from 'path';
import * as argon2 from 'argon2';

const { PrismaClient } = require(
  path.resolve(process.cwd(), 'node_modules', '.prisma', 'auth-client'),
);
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.AUTH_DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://cesi-shop.local';

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: async (password: string) => argon2.hash(password),
      verify: async (data: { hash: string; password: string }) => {
        try {
          return await argon2.verify(data.hash, data.password);
        } catch {
          return false;
        }
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24h
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'BUYER',
        required: false,
      },
    },
  },
  plugins: [],
});

export type Auth = typeof auth;
