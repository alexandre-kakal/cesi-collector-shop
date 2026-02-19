import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ProcessedVariant {
  type: 'THUMB' | 'OPTIMIZED';
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

@Injectable()
export class SharpService {
  private readonly logger = new Logger(SharpService.name);

  async generateVariants(inputBuffer: Buffer): Promise<ProcessedVariant[]> {
    const variants: ProcessedVariant[] = [];

    try {
      const thumbBuffer = await sharp(inputBuffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();

      const thumbMeta = await sharp(thumbBuffer).metadata();
      variants.push({
        type: 'THUMB',
        buffer: thumbBuffer,
        width: thumbMeta.width || 300,
        height: thumbMeta.height || 300,
        size: thumbBuffer.length,
      });

      const optimizedBuffer = await sharp(inputBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const optimizedMeta = await sharp(optimizedBuffer).metadata();
      variants.push({
        type: 'OPTIMIZED',
        buffer: optimizedBuffer,
        width: optimizedMeta.width || 1200,
        height: optimizedMeta.height || 1200,
        size: optimizedBuffer.length,
      });
    } catch (err) {
      this.logger.error('Error generating variants:', err);
      throw err;
    }

    return variants;
  }
}
