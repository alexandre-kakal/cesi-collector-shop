import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import type { PrismaClient as MediaPrismaClient } from '@prisma-media/client';

const { PrismaClient } = require(
  path.resolve(process.cwd(), 'node_modules', '.prisma', 'media-client'),
) as {
  PrismaClient: typeof MediaPrismaClient;
};
const { PrismaPg } = require('@prisma/adapter-pg');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.MEDIA_DATABASE_URL ?? '',
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
