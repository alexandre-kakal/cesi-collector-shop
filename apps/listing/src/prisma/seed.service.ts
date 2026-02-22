import { Injectable } from '@nestjs/common';
import { SEED_IDS } from '@app/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    const { categoryFigurines, categoryCartes, listing1, listing2 } = SEED_IDS.listing;
    const sellerId = SEED_IDS.auth.userSeller;
    const { mediaPhoto1, mediaPhoto2 } = SEED_IDS.media;

    await this.prisma.category.upsert({
      where: { id: categoryFigurines },
      create: {
        id: categoryFigurines,
        name: 'Figurines',
        description: 'Figurines et statuettes de collection',
      },
      update: {},
    });

    await this.prisma.category.upsert({
      where: { id: categoryCartes },
      create: {
        id: categoryCartes,
        name: 'Cartes à collectionner',
        description: 'Cartes sportives, Pokémon, etc.',
      },
      update: {},
    });

    await this.prisma.listing.upsert({
      where: { id: listing1 },
      create: {
        id: listing1,
        title: 'Figurine Rare Édition Limitée',
        description: 'Figurine neuve sous blister, édition limitée 2024.',
        price: 29.99,
        sellerId,
        categoryId: categoryFigurines,
        status: 'PENDING',
        photos: {
          create: [
            { mediaId: mediaPhoto1, order: 0 },
            { mediaId: mediaPhoto2, order: 1 },
          ],
        },
      },
      update: {},
    });

    await this.prisma.listing.upsert({
      where: { id: listing2 },
      create: {
        id: listing2,
        title: 'Lot de cartes Pokémon',
        description: '10 cartes communes + 2 rares.',
        price: 15.5,
        sellerId,
        categoryId: categoryCartes,
        status: 'APPROVED',
        photos: {
          create: [{ mediaId: mediaPhoto2, order: 0 }],
        },
      },
      update: {},
    });
  }
}
