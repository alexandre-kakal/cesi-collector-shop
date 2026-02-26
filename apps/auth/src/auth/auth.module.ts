import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RabbitMQClientModule, JwtStrategy, JwtAuthGuard } from '@app/shared';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: 900, // 15 minutes in seconds
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
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
