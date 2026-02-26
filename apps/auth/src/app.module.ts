import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthController, PrometheusModule } from '@app/shared';

@Module({
  imports: [
    PrometheusModule.forRoot({ serviceName: 'auth' }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/auth/.env',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
