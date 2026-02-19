export const MEDIA_EVENTS = {
  UPLOADED: 'media.uploaded',
  PROCESSING_FAILED: 'media.processing_failed',
  DELETED: 'media.deleted',
} as const;

export interface MediaUploadedEvent {
  mediaId: string;
  uploadedBy: string;
  listingId?: string;
  originalUrl: string;
  variants: {
    type: string;
    url: string;
    width: number;
    height: number;
  }[];
  uploadedAt: Date;
}

export interface MediaProcessingFailedEvent {
  mediaId: string;
  uploadedBy: string;
  error: string;
  failedAt: Date;
}
