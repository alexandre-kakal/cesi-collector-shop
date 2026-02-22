import { Injectable } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { SEED_IDS } from '@app/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    const { userAdmin, userSeller, userBuyer } = SEED_IDS.auth;
    const now = new Date();
    const defaultPasswordHash = hashSync('Password123!', 10);

    await this.prisma.user.upsert({
      where: { id: userAdmin },
      create: {
        id: userAdmin,
        name: 'Admin Collector',
        email: 'admin@collector-shop.local',
        emailVerified: true,
        role: 'ADMIN',
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    await this.prisma.user.upsert({
      where: { id: userSeller },
      create: {
        id: userSeller,
        name: 'Marie Vendeuse',
        email: 'seller@collector-shop.local',
        emailVerified: true,
        role: 'SELLER',
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    await this.prisma.user.upsert({
      where: { id: userBuyer },
      create: {
        id: userBuyer,
        name: 'Paul Acheteur',
        email: 'buyer@collector-shop.local',
        emailVerified: true,
        role: 'BUYER',
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    const accountIdAdmin = 'acc-11111111-1111-1111-1111-111111111111';
    const accountIdSeller = 'acc-22222222-2222-2222-2222-222222222222';
    const accountIdBuyer = 'acc-33333333-3333-3333-3333-333333333333';

    await this.prisma.account.upsert({
      where: { id: accountIdAdmin },
      create: {
        id: accountIdAdmin,
        userId: userAdmin,
        accountId: userAdmin,
        providerId: 'credential',
        password: defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    await this.prisma.account.upsert({
      where: { id: accountIdSeller },
      create: {
        id: accountIdSeller,
        userId: userSeller,
        accountId: userSeller,
        providerId: 'credential',
        password: defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    await this.prisma.account.upsert({
      where: { id: accountIdBuyer },
      create: {
        id: accountIdBuyer,
        userId: userBuyer,
        accountId: userBuyer,
        providerId: 'credential',
        password: defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });
  }
}
