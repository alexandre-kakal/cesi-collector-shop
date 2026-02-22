import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import type { PrismaClient as ModerationPrismaClient } from '@prisma-moderation/client';

const { PrismaClient } = require(
  path.resolve(process.cwd(), 'node_modules', '.prisma', 'moderation-client'),
) as {
  PrismaClient: typeof ModerationPrismaClient;
};
const { PrismaPg } = require('@prisma/adapter-pg');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    });
    super({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
