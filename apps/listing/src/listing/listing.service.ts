import { Injectable, NotFoundException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  RequestUser,
  Role,
} from '@app/shared';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
  ) {}

  private async fetchMedia(mediaId: string): Promise<{ originalUrl?: string; variants?: { variantType: string; url: string }[] } | null> {
    const baseUrl = this.configService.get<string>('MEDIA_SERVICE_URL', 'http://media:3050');
    try {
      const res = await fetch(`${baseUrl}/api/v1/media/${mediaId}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private async enrichPhotosWithMedia<T extends { photos: { mediaId: string }[] }>(item: T): Promise<T> {
    if (!item.photos?.length) return item;
    const photosWithMedia = await Promise.all(
      item.photos.map(async (photo) => {
        const media = await this.fetchMedia(photo.mediaId);
        return { ...photo, media: media || undefined };
      }),
    );
    return { ...item, photos: photosWithMedia };
  }

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

  async findAll(filter: FilterListingDto, user?: RequestUser) {
    const { status, categoryId, sellerId: filterSellerId, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Visibility rules based on user role
    if (!user || user.role === Role.BUYER) {
      // Public/BUYER: Only APPROVED listings
      where.status = ListingStatus.APPROVED;
    } else if (user.role === Role.SELLER) {
      // SELLER: only their listings when sellerId is requested (and must match user)
      if (filterSellerId && filterSellerId === user.id) {
        where.sellerId = user.id;
        if (status) where.status = status;
      } else {
        // Sinon: APPROVED ou (PENDING et possédées par eux), sauf si status est explicite
        if (status) {
          where.status = status;
        } else {
          where.OR = [
            { status: ListingStatus.APPROVED },
            { status: ListingStatus.PENDING, sellerId: user.id },
          ];
        }
      }
    }
    // ADMIN: No filter by default, sees all statuses

    // Apply additional filters for ADMIN
    if (status && user?.role === Role.ADMIN) {
      delete where.OR;
      where.status = status;
    }
    if (filterSellerId && user?.role === Role.ADMIN) {
      where.sellerId = filterSellerId;
    }
    if (categoryId) where.categoryId = categoryId;

    const [rawItems, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, photos: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const items = await Promise.all(rawItems.map((item) => this.enrichPhotosWithMedia(item)));
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user?: RequestUser) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { category: true, photos: true },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    // Visibility check
    if (!user || user.role === Role.BUYER) {
      if (listing.status !== ListingStatus.APPROVED) {
        throw new ForbiddenException('This listing is not available');
      }
    } else if (user.role === Role.SELLER) {
      if (listing.status === ListingStatus.PENDING && listing.sellerId !== user.id) {
        throw new ForbiddenException('This listing is not available');
      }
      if (listing.status === ListingStatus.REJECTED && listing.sellerId !== user.id) {
        throw new ForbiddenException('This listing is not available');
      }
    }
    // ADMIN can see everything

    return this.enrichPhotosWithMedia(listing);
  }

  async update(id: string, dto: UpdateListingDto, user: RequestUser) {
    const listing = await this.findOne(id, user);

    // Re-moderation logic: SELLER edit → toujours PENDING + événement pour la file de modération
    let newStatus = listing.status;
    if (user.role === Role.SELLER) {
      newStatus = ListingStatus.PENDING;
      if (listing.status !== ListingStatus.PENDING) {
        this.logger.log(`Listing ${id} status changed to PENDING due to SELLER modification`);
      }
    }
    // ADMIN updates don't trigger re-moderation

    const updated = await this.prisma.listing.update({
      where: { id },
      data: { ...dto, status: newStatus },
      include: { category: true, photos: true },
    });

    // Émettre l'événement pour (re-)enqueue en modération à chaque modification SELLER
    if (user.role === Role.SELLER) {
      const event: ListingCreatedEvent = {
        listingId: updated.id,
        sellerId: updated.sellerId,
        title: updated.title,
        categoryId: updated.categoryId,
        price: Number(updated.price),
        createdAt: updated.createdAt,
      };
      this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.LISTING_CREATED, event);
      this.logger.log(`Listing ${id} (re-)enqueued for moderation`);
    }

    return updated;
  }

  async remove(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.listing.delete({ where: { id } });
  }

  async updateStatus(id: string, status: ListingStatus) {
    return this.prisma.listing.update({
      where: { id },
      data: { status },
    });
  }

  async getNextPhotoOrder(listingId: string): Promise<number> {
    const last = await this.prisma.listingPhoto.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return last ? last.order + 1 : 0;
  }

  async addPhoto(listingId: string, mediaId: string, order = 0) {
    return this.prisma.listingPhoto.create({
      data: { listingId, mediaId, order },
    });
  }

  async checkOwnership(listingId: string, userId: string): Promise<boolean> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    return listing.sellerId === userId;
  }
}
