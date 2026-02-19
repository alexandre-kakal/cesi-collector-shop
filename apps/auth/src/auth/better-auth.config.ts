import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import * as path from 'path';

const { PrismaClient } = require(
  path.resolve(process.cwd(), 'node_modules', '.prisma', 'auth-client'),
);
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.AUTH_DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
