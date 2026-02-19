import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ModerationService } from '../moderation/moderation.service';
import { RABBITMQ_ROUTING_KEYS, ListingCreatedEvent } from '@app/shared';

@Controller()
export class ModerationEventsHandler {
  private readonly logger = new Logger(ModerationEventsHandler.name);

  constructor(private readonly moderationService: ModerationService) {}

  @EventPattern(RABBITMQ_ROUTING_KEYS.LISTING_CREATED)
  async handleListingCreated(@Payload() event: ListingCreatedEvent) {
    this.logger.log(`Received listing.created for listingId: ${event.listingId}`);
    await this.moderationService.enqueue(event.listingId, event.sellerId);
  }
}
