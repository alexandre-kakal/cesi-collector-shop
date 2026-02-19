export const LISTING_EVENTS = {
  CREATED: 'listing.created',
  UPDATED: 'listing.updated',
  APPROVED: 'listing.approved',
  REJECTED: 'listing.rejected',
  DELETED: 'listing.deleted',
} as const;

export interface ListingCreatedEvent {
  listingId: string;
  sellerId: string;
  title: string;
  categoryId: string;
  price: number;
  createdAt: Date;
}

export interface ListingApprovedEvent {
  listingId: string;
  adminId: string;
  approvedAt: Date;
}

export interface ListingRejectedEvent {
  listingId: string;
  adminId: string;
  reason: string;
  rejectedAt: Date;
}

export interface ListingUpdatedEvent {
  listingId: string;
  sellerId: string;
  updatedFields: string[];
  updatedAt: Date;
}
