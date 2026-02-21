import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { ListingModule } from './listing/listing.module';
import { EventsModule } from './events/events.module';
import { JwtStrategy, JwtAuthGuard, HealthController } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/listing/.env',
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
    CategoryModule,
    ListingModule,
    EventsModule,
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
