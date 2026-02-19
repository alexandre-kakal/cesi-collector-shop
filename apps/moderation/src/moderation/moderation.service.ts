import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { RejectListingDto } from './dto/reject-listing.dto';
import {
  RABBITMQ_CLIENT_TOKEN,
  RABBITMQ_ROUTING_KEYS,
  ListingApprovedEvent,
  ListingRejectedEvent,
} from '@app/shared';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
  ) {}

  async getQueue() {
    return this.prisma.moderationQueue.findMany({
      where: { status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getLogs(limit = 50) {
    return this.prisma.moderationLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async enqueue(listingId: string, sellerId: string) {
    return this.prisma.moderationQueue.upsert({
      where: { listingId },
      update: { status: 'WAITING' },
      create: { listingId, sellerId, status: 'WAITING' },
    });
  }

  async approve(id: string, adminId: string, ipAddress?: string) {
    const item = await this.prisma.moderationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Queue item ${id} not found`);

    await this.prisma.moderationQueue.update({
      where: { id },
      data: { status: 'DONE' },
    });

    await this.prisma.moderationLog.create({
      data: {
        adminId,
        listingId: item.listingId,
        action: 'APPROVE',
        ipAddress,
      },
    });

    const event: ListingApprovedEvent = {
      listingId: item.listingId,
      adminId,
      approvedAt: new Date(),
    };

    this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.LISTING_APPROVED, event);
    this.logger.log(`Approved listing ${item.listingId}`);

    return { success: true, listingId: item.listingId };
  }

  async reject(id: string, adminId: string, dto: RejectListingDto, ipAddress?: string) {
    const item = await this.prisma.moderationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Queue item ${id} not found`);

    await this.prisma.moderationQueue.update({
      where: { id },
      data: { status: 'DONE' },
    });

    await this.prisma.moderationLog.create({
      data: {
        adminId,
        listingId: item.listingId,
        action: 'REJECT',
        reason: dto.reason,
        ipAddress,
      },
    });

    const event: ListingRejectedEvent = {
      listingId: item.listingId,
      adminId,
      reason: dto.reason,
      rejectedAt: new Date(),
    };

    this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.LISTING_REJECTED, event);
    this.logger.log(`Rejected listing ${item.listingId}`);

    return { success: true, listingId: item.listingId };
  }
}
