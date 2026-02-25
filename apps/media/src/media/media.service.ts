import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SharpService } from '../processing/sharp.service';
import { RABBITMQ_CLIENT_TOKEN, RABBITMQ_ROUTING_KEYS, MediaUploadedEvent } from '@app/shared';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly sharpService: SharpService,
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
  ) {}

  async upload(file: Express.Multer.File, uploadedBy: string, listingId?: string) {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    const mediaFile = await this.prisma.mediaFile.create({
      data: {
        uploadedBy,
        listingId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: `originals/${uuidv4()}-${file.originalname}`,
        status: 'PROCESSING',
      },
    });

    try {
      const originalKey = mediaFile.storageKey;
      await this.minioService.upload(originalKey, file.buffer, file.mimetype);

      const variants = await this.sharpService.generateVariants(file.buffer);

      const savedVariants = [];
      for (const variant of variants) {
        const variantKey = `variants/${mediaFile.id}/${variant.type.toLowerCase()}.webp`;
        await this.minioService.upload(variantKey, variant.buffer, 'image/webp');

        await this.prisma.mediaVariant.create({
          data: {
            mediaFileId: mediaFile.id,
            variantType: variant.type,
            storageKey: variantKey,
            width: variant.width,
            height: variant.height,
            size: variant.size,
          },
        });

        savedVariants.push({
          type: variant.type,
          url: this.minioService.getPublicUrl(variantKey),
          width: variant.width,
          height: variant.height,
        });
      }

      await this.prisma.mediaFile.update({
        where: { id: mediaFile.id },
        data: { status: 'READY' },
      });

      const event: MediaUploadedEvent = {
        mediaId: mediaFile.id,
        uploadedBy,
        listingId,
        originalUrl: this.minioService.getPublicUrl(originalKey),
        variants: savedVariants,
        uploadedAt: new Date(),
      };

      this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.MEDIA_UPLOADED, event);
      this.logger.log(`Media ${mediaFile.id} uploaded and processed`);

      return {
        ...mediaFile,
        status: 'READY',
        originalUrl: this.minioService.getPublicUrl(originalKey),
        variants: savedVariants,
      };
    } catch (err) {
      this.logger.error(`Error processing media ${mediaFile.id}:`, err);
      await this.prisma.mediaFile.update({
        where: { id: mediaFile.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  async findOne(id: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    return {
      ...media,
      originalUrl: this.minioService.getPublicUrl(media.storageKey),
      variants: media.variants.map((v) => ({
        ...v,
        url: this.minioService.getPublicUrl(v.storageKey),
      })),
    };
  }

  async checkOwnership(mediaId: string, userId: string): Promise<boolean> {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: { uploadedBy: true },
    });

    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }

    return media.uploadedBy === userId;
  }

  async remove(id: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    // Delete from MinIO (original + variants)
    try {
      await this.minioService.delete(media.storageKey);
      for (const variant of media.variants) {
        await this.minioService.delete(variant.storageKey);
      }
    } catch (error) {
      this.logger.error(`Error deleting media files from MinIO: ${error.message}`);
    }

    // Delete from database (cascade will delete variants)
    await this.prisma.mediaFile.delete({ where: { id } });

    this.logger.log(`Media ${id} deleted successfully`);
    return { message: 'Media deleted successfully' };
  }
}
