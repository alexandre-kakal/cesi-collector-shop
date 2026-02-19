import { ListingStatus } from '@app/shared';

export interface TestListing {
  id: string;
  title: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string;
  status: ListingStatus;
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
}

export interface TestMedia {
  id: string;
  uploadedBy: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: string;
}

export function createTestListing(
  overrides?: Partial<TestListing>,
): TestListing {
  return {
    id: `listing-${Date.now()}`,
    title: 'Test Listing',
    description: 'A test listing',
    price: 100,
    sellerId: 'seller-test-id',
    categoryId: 'category-test-id',
    status: ListingStatus.PENDING,
    ...overrides,
  };
}

export function createTestCategory(
  overrides?: Partial<TestCategory>,
): TestCategory {
  return {
    id: `category-${Date.now()}`,
    name: 'Test Category',
    description: 'A test category',
    ...overrides,
  };
}

export function createTestMedia(overrides?: Partial<TestMedia>): TestMedia {
  return {
    id: `media-${Date.now()}`,
    uploadedBy: 'seller-test-id',
    originalName: 'test-image.jpg',
    storageKey: 'test/key.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    status: 'READY',
    ...overrides,
  };
}
