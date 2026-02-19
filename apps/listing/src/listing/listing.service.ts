import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { FilterListingDto } from './dto/filter-listing.dto';
import {
  RABBITMQ_CLIENT_TOKEN,
  RABBITMQ_ROUTING_KEYS,
  ListingCreatedEvent,
  ListingStatus,
} from '@app/shared';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
  ) {}

  async create(dto: CreateListingDto, sellerId: string) {
    const listing = await this.prisma.listing.create({
      data: {
        ...dto,
        sellerId,
        status: 'PENDING',
      },
      include: { category: true, photos: true },
    });

    const event: ListingCreatedEvent = {
      listingId: listing.id,
      sellerId: listing.sellerId,
      title: listing.title,
      categoryId: listing.categoryId,
      price: Number(listing.price),
      createdAt: listing.createdAt,
    };

    this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.LISTING_CREATED, event);
    this.logger.log(`Published listing.created event for listingId: ${listing.id}`);

    return listing;
  }

  async findAll(filter: FilterListingDto) {
    const { status, categoryId, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, photos: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { category: true, photos: true },
    });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async update(id: string, dto: UpdateListingDto, _userId: string) {
    await this.findOne(id);
    return this.prisma.listing.update({
      where: { id },
      data: dto,
      include: { category: true, photos: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.listing.delete({ where: { id } });
  }

  async updateStatus(id: string, status: ListingStatus) {
    return this.prisma.listing.update({
      where: { id },
      data: { status },
    });
  }

  async addPhoto(listingId: string, mediaId: string, order = 0) {
    return this.prisma.listingPhoto.create({
      data: { listingId, mediaId, order },
    });
  }
}
