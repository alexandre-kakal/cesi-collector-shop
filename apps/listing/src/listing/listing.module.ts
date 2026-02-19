import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { RabbitMQClientModule } from '@app/shared';

@Module({
  imports: [
    RabbitMQClientModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
        exchange: 'listings.exchange',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
