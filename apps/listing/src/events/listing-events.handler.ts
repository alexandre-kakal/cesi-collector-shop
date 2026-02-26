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
    this.logger.log(
      `Received media.uploaded for mediaId: ${event.mediaId}, listingId: ${event.listingId ?? 'none'}`,
    );
    if (event.listingId) {
      try {
        const order = await this.listingService.getNextPhotoOrder(event.listingId);
        await this.listingService.addPhoto(event.listingId, event.mediaId, order);
        this.logger.log(`ListingPhoto created: listing ${event.listingId}, media ${event.mediaId}`);
      } catch (err) {
        this.logger.error(
          `Failed to add photo to listing ${event.listingId}: ${err instanceof Error ? err.message : err}`,
        );
        throw err;
      }
    } else {
      this.logger.debug('media.uploaded sans listingId — pas de ListingPhoto créé');
    }
  }
}
