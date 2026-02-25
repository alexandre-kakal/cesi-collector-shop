import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AuthExceptionFilter } from '@app/shared';

async function bootstrap() {
  const logger = new Logger('ListingService');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('LISTING_PORT', 3020);
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'listing.user-events',
      exchange: 'users.exchange',
      exchangeType: 'topic',
      routingKey: 'user.*',
      noAck: true,
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'listing.moderation-events',
      exchange: 'listings.exchange',
      exchangeType: 'topic',
      routingKey: 'listing.*',
      noAck: true,
      queueOptions: { durable: true },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'listing.media-events',
      exchange: 'media.exchange',
      exchangeType: 'topic',
      routingKey: 'media.*',
      noAck: true,
      queueOptions: { durable: true },
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AuthExceptionFilter());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.startAllMicroservices();
  await app.listen(port);
  logger.log(`Listing service running on port ${port}`);
}

bootstrap();
