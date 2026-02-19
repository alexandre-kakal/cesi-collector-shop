import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT_TOKEN, RABBITMQ_ROUTING_KEYS, UserRegisteredEvent } from '@app/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
  ) {}

  async publishUserRegistered(userId: string, email: string, role: string): Promise<void> {
    const event: UserRegisteredEvent = {
      userId,
      email,
      role,
      registeredAt: new Date(),
    };

    this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.USER_REGISTERED, event);
    this.logger.log(`Published user.registered event for userId: ${userId}`);
  }
}
