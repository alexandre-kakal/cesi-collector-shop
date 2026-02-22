import { Injectable } from '@nestjs/common';
import { SEED_IDS } from '@app/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    const { listing1, listing2 } = SEED_IDS.listing;
    const sellerId = SEED_IDS.auth.userSeller;
    const adminId = SEED_IDS.auth.userAdmin;

    await this.prisma.moderationQueue.upsert({
      where: { listingId: listing1 },
      create: {
        listingId: listing1,
        sellerId,
        status: 'WAITING',
      },
      update: {},
    });

    await this.prisma.moderationQueue.upsert({
      where: { listingId: listing2 },
      create: {
        listingId: listing2,
        sellerId,
        status: 'DONE',
      },
      update: {},
    });

    const existing = await this.prisma.moderationLog.findFirst({
      where: { listingId: listing2 },
    });
    if (!existing) {
      await this.prisma.moderationLog.create({
        data: {
          adminId,
          listingId: listing2,
          action: 'APPROVE',
          ipAddress: '127.0.0.1',
        },
      });
    }
  }
}
