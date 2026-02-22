import { Injectable } from '@nestjs/common';
import { SEED_IDS } from '@app/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    const { mediaPhoto1, mediaPhoto2 } = SEED_IDS.media;
    const uploadedBy = SEED_IDS.auth.userSeller;

    await this.prisma.mediaFile.upsert({
      where: { id: mediaPhoto1 },
      create: {
        id: mediaPhoto1,
        uploadedBy,
        originalName: 'figurine-1.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        storageKey: `seed/${mediaPhoto1}/original.jpg`,
        status: 'READY',
        variants: {
          create: {
            variantType: 'ORIGINAL',
            storageKey: `seed/${mediaPhoto1}/original.jpg`,
            width: 800,
            height: 600,
            size: 102400,
          },
        },
      },
      update: {},
    });

    await this.prisma.mediaFile.upsert({
      where: { id: mediaPhoto2 },
      create: {
        id: mediaPhoto2,
        uploadedBy,
        originalName: 'carte-1.png',
        mimeType: 'image/png',
        size: 51200,
        storageKey: `seed/${mediaPhoto2}/original.png`,
        status: 'READY',
        variants: {
          create: {
            variantType: 'ORIGINAL',
            storageKey: `seed/${mediaPhoto2}/original.png`,
            width: 400,
            height: 400,
            size: 51200,
          },
        },
      },
      update: {},
    });
  }
}
