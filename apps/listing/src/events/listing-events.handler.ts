import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ListingService } from '../listing/listing.service';
import {
  RABBITMQ_ROUTING_KEYS,
  UserRegisteredEvent,
  ListingApprovedEvent,
  ListingRejectedEvent,
  MediaUploadedEvent,
  ListingStatus,
} from '@app/shared';

@Controller()
export class ListingEventsHandler {
  private readonly logger = new Logger(ListingEventsHandler.name);

  constructor(private readonly listingService: ListingService) {}

  @EventPattern(RABBITMQ_ROUTING_KEYS.USER_REGISTERED)
  async handleUserRegistered(@Payload() event: UserRegisteredEvent) {
    this.logger.log(`Received user.registered for userId: ${event.userId}`);
  }

  @EventPattern(RABBITMQ_ROUTING_KEYS.LISTING_APPROVED)
  async handleListingApproved(@Payload() event: ListingApprovedEvent) {
    this.logger.log(`Received listing.approved for listingId: ${event.listingId}`);
    await this.listingService.updateStatus(event.listingId, ListingStatus.APPROVED);
  }

  @EventPattern(RABBITMQ_ROUTING_KEYS.LISTING_REJECTED)
  async handleListingRejected(@Payload() event: ListingRejectedEvent) {
    this.logger.log(`Received listing.rejected for listingId: ${event.listingId}`);
    await this.listingService.updateStatus(event.listingId, ListingStatus.REJECTED);
  }

  @EventPattern(RABBITMQ_ROUTING_KEYS.MEDIA_UPLOADED)
  async handleMediaUploaded(@Payload() event: MediaUploadedEvent) {
    this.logger.log(`Received media.uploaded for mediaId: ${event.mediaId}`);
    if (event.listingId) {
      await this.listingService.addPhoto(event.listingId, event.mediaId, 0);
    }
  }
}
