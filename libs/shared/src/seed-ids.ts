/**
 * IDs prédéfinis pour les seeds — partagés entre micro-services.
 * Utilisés lorsqu'un service référence une entité d'un autre (EXT dans le MCD).
 *
 * Ordre des seeds : Auth → Media → Listing → Moderation
 */

/** Auth Service — user.id référencé par Listing (sellerId), Moderation (adminId, sellerId), Media (uploadedBy) */
export const SEED_IDS = {
  auth: {
    userAdmin: '11111111-1111-1111-1111-111111111111',
    userSeller: '22222222-2222-2222-2222-222222222222',
    userBuyer: '33333333-3333-3333-3333-333333333333',
  },
  /** Media Service — MediaFile.id référencé par Listing (ListingPhoto.mediaId) */
  media: {
    mediaPhoto1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    mediaPhoto2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  },
  /** Listing Service — Listing.id référencé par Moderation (ModerationQueue/ModerationLog.listingId) */
  listing: {
    categoryFigurines: 'c1111111-1111-1111-1111-111111111111',
    categoryCartes: 'c2222222-2222-2222-2222-222222222222',
    listing1: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    listing2: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  },
} as const;
