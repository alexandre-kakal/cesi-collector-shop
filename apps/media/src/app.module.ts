import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './minio/minio.module';
import { ProcessingModule } from './processing/processing.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/media/.env',
    }),
    PrismaModule,
    MinioModule,
    ProcessingModule,
    MediaModule,
  ],
})
export class AppModule {}
