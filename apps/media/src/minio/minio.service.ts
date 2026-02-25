import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.configService.get<string>('MINIO_BUCKET_NAME', 'collector-media');

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minio_access_key'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minio_secret_key'),
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket "${this.bucket}" created`);

        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(this.bucket, policy);
        this.logger.log(`Public read policy set on bucket "${this.bucket}"`);
      }
    } catch (err) {
      this.logger.error('Error ensuring bucket:', err);
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const stream = Readable.from(buffer);
    await this.client.putObject(this.bucket, key, stream, buffer.length, {
      'Content-Type': contentType,
    });
    return `/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  /** URL accessible depuis le navigateur (via proxy nginx ou direct MinIO) */
  getPublicUrl(key: string): string {
    const publicBase = this.configService.get<string>('MINIO_PUBLIC_BASE_URL');
    if (publicBase) {
      return `${publicBase.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    return `http://${endpoint}:${port}/${this.bucket}/${key}`;
  }
}
