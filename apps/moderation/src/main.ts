import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AuthExceptionFilter } from '@app/shared';

async function bootstrap() {
  const logger = new Logger('ModerationService');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('MODERATION_PORT', 3030);
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'moderation.listing-events',
      exchange: 'listings.exchange',
      exchangeType: 'topic',
      routingKey: 'listing.created',
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

  app.enableCors({ origin: '*' });

  await app.startAllMicroservices();
  await app.listen(port);
  logger.log(`Moderation service running on port ${port}`);
}

bootstrap();
