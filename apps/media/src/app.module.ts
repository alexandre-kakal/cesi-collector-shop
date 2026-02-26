import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './minio/minio.module';
import { ProcessingModule } from './processing/processing.module';
import { MediaModule } from './media/media.module';
import { JwtStrategy, JwtAuthGuard, HealthController, PrometheusModule } from '@app/shared';

@Module({
  imports: [
    PrometheusModule.forRoot({ serviceName: 'media' }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/media/.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
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
