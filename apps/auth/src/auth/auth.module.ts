import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RabbitMQClientModule } from '@app/shared';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService
          .get<string>('JWT_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
    RabbitMQClientModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
        exchange: 'users.exchange',
      }),
      inject: [ConfigService],
    }),
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
