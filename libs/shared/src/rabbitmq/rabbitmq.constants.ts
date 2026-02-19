export const RABBITMQ_EXCHANGES = {
  USERS: 'users.exchange',
  LISTINGS: 'listings.exchange',
  MEDIA: 'media.exchange',
} as const;

export const RABBITMQ_QUEUES = {
  // Auth service queues (publishes only)
  // Listing service queues
  LISTING_USER_EVENTS: 'listing.user-events',
  LISTING_MODERATION_EVENTS: 'listing.moderation-events',
  LISTING_MEDIA_EVENTS: 'listing.media-events',
  // Moderation service queues
  MODERATION_LISTING_EVENTS: 'moderation.listing-events',
  // Media service queues (publishes only for now)
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  LISTING_CREATED: 'listing.created',
  LISTING_APPROVED: 'listing.approved',
  LISTING_REJECTED: 'listing.rejected',
  LISTING_UPDATED: 'listing.updated',
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_FAILED: 'media.processing_failed',
} as const;

export const RABBITMQ_CLIENT_TOKEN = 'RABBITMQ_CLIENT';
