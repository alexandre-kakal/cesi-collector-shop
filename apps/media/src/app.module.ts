import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './minio/minio.module';
import { ProcessingModule } from './processing/processing.module';
import { MediaModule } from './media/media.module';
import { JwtStrategy, JwtAuthGuard, HealthController } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/media/.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        publicKey: configService
          .get<string>('JWT_PUBLIC_KEY')
          ?.replace(/\\n/g, '\n'),
        signOptions: { algorithm: 'RS256' },
      }),
      inject: [ConfigService],
      global: true,
    }),
    PrismaModule,
    MinioModule,
    ProcessingModule,
    MediaModule,
  ],
  controllers: [HealthController],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
