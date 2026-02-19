import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBITMQ_CLIENT_TOKEN } from './rabbitmq.constants';

export interface RabbitMQClientOptions {
  url: string;
  exchange?: string;
}

@Module({})
export class RabbitMQClientModule {
  static register(options: RabbitMQClientOptions): DynamicModule {
    return {
      module: RabbitMQClientModule,
      imports: [
        ClientsModule.register([
          {
            name: RABBITMQ_CLIENT_TOKEN,
            transport: Transport.RMQ,
            options: {
              urls: [options.url],
              queue: 'default',
              exchange: options.exchange,
              exchangeType: 'topic',
              noAck: true,
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  static registerAsync(options: {
    useFactory: (...args: any[]) => RabbitMQClientOptions | Promise<RabbitMQClientOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: RabbitMQClientModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: RABBITMQ_CLIENT_TOKEN,
            useFactory: async (...args: any[]) => {
              const config = await options.useFactory(...args);
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [config.url],
                  queue: 'default',
                  exchange: config.exchange,
                  exchangeType: 'topic',
                  noAck: true,
                  queueOptions: {
                    durable: true,
                  },
                },
              };
            },
            inject: options.inject || [],
            imports: options.imports || [],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
