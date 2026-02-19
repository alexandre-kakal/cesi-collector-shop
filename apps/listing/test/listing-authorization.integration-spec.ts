import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ListingStatus, Role } from '@app/shared';
import {
  TEST_USERS,
  generateTestToken,
  getAuthHeader,
} from '../../../test/helpers/auth.helper';

describe('Listing Service - Authorization Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let categoryId: string;
  let approvedListingId: string;
  let pendingListingId: string;
  let rejectedListingId: string;
  let seller2PendingListingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test category
    const category = await prisma.category.create({
      data: { name: 'Test Category', description: 'Test' },
    });
    categoryId = category.id;

    // Create test listings with different statuses
    const approvedListing = await prisma.listing.create({
      data: {
        title: 'Approved Listing',
        description: 'Test',
        price: 100,
        categoryId,
        sellerId: TEST_USERS.SELLER.id,
        status: ListingStatus.APPROVED,
      },
    });
    approvedListingId = approvedListing.id;

    const pendingListing = await prisma.listing.create({
      data: {
        title: 'Pending Listing',
        description: 'Test',
        price: 100,
        categoryId,
        sellerId: TEST_USERS.SELLER.id,
        status: ListingStatus.PENDING,
      },
    });
    pendingListingId = pendingListing.id;

    const rejectedListing = await prisma.listing.create({
      data: {
        title: 'Rejected Listing',
        description: 'Test',
        price: 100,
        categoryId,
        sellerId: TEST_USERS.SELLER.id,
        status: ListingStatus.REJECTED,
      },
    });
    rejectedListingId = rejectedListing.id;

    // Create listing by another seller
    const seller2Listing = await prisma.listing.create({
      data: {
        title: 'Seller 2 Pending Listing',
        description: 'Test',
        price: 100,
        categoryId,
        sellerId: TEST_USERS.SELLER_2.id,
        status: ListingStatus.PENDING,
      },
    });
    seller2PendingListingId = seller2Listing.id;
  });

  afterAll(async () => {
    await prisma.listing.deleteMany({});
    await prisma.category.deleteMany({});
    await app.close();
  });

  describe('GET /api/v1/listings - Visibility Rules', () => {
    it('should allow public access and return only APPROVED listings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/listings')
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.items.every((l: any) => l.status === ListingStatus.APPROVED)).toBe(
        true,
      );
      expect(response.body.items.length).toBe(1);
    });

    it('BUYER should see only APPROVED listings', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      const response = await request(app.getHttpServer())
        .get('/api/v1/listings')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.items.every((l: any) => l.status === ListingStatus.APPROVED)).toBe(
        true,
      );
      expect(response.body.items.length).toBe(1);
    });

    it('SELLER should see APPROVED + their own PENDING listings', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .get('/api/v1/listings')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
      const sellerListings = response.body.items.filter(
        (l: any) => l.sellerId === TEST_USERS.SELLER.id,
      );
      expect(sellerListings.some((l: any) => l.status === ListingStatus.PENDING)).toBe(true);
      expect(sellerListings.some((l: any) => l.status === ListingStatus.APPROVED)).toBe(true);

      // Should NOT see other sellers' PENDING listings
      expect(
        response.body.items.some((l: any) => l.id === seller2PendingListingId),
      ).toBe(false);
    });

    it('ADMIN should see ALL listings regardless of status', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .get('/api/v1/listings')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(4);
      const statuses = response.body.items.map((l: any) => l.status);
      expect(statuses).toContain(ListingStatus.APPROVED);
      expect(statuses).toContain(ListingStatus.PENDING);
      expect(statuses).toContain(ListingStatus.REJECTED);
    });
  });

  describe('GET /api/v1/listings/:id - Individual Listing Visibility', () => {
    it('should allow public access to APPROVED listing', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${approvedListingId}`)
        .expect(200);
    });

    it('should deny public access to PENDING listing', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${pendingListingId}`)
        .expect(403);
    });

    it('BUYER should see APPROVED listing', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('BUYER should NOT see PENDING listing', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${pendingListingId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('SELLER should see their own PENDING listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${pendingListingId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('SELLER should NOT see another sellers PENDING listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${seller2PendingListingId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('SELLER should see their own REJECTED listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${rejectedListingId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('ADMIN should see any listing regardless of status', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);

      await request(app.getHttpServer())
        .get(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/listings/${pendingListingId}`)
        .set(getAuthHeader(token))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/listings/${rejectedListingId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });
  });

  describe('POST /api/v1/listings - Create Listing', () => {
    const createDto = {
      title: 'New Listing',
      description: 'Test',
      price: 150,
      categoryId: '',
    };

    beforeEach(() => {
      createDto.categoryId = categoryId;
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).post('/api/v1/listings').send(createDto).expect(401);
    });

    it('should deny BUYER from creating listings', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(403);
    });

    it('should allow SELLER to create listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(201);

      expect(response.body.sellerId).toBe(TEST_USERS.SELLER.id);
      expect(response.body.status).toBe(ListingStatus.PENDING);

      // Cleanup
      await prisma.listing.delete({ where: { id: response.body.id } });
    });

    it('should allow ADMIN to create listing', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(201);

      expect(response.body.status).toBe(ListingStatus.PENDING);

      // Cleanup
      await prisma.listing.delete({ where: { id: response.body.id } });
    });
  });

  describe('PATCH /api/v1/listings/:id - Update Listing with Ownership', () => {
    const updateDto = { price: 200 };

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${approvedListingId}`)
        .send(updateDto)
        .expect(401);
    });

    it('should deny BUYER from updating listings', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(403);
    });

    it('should allow SELLER to update their own listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(200);
    });

    it('should deny SELLER from updating another sellers listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${seller2PendingListingId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(403);
    });

    it('should allow ADMIN to update any listing', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${seller2PendingListingId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(200);
    });

    it('should change APPROVED listing to PENDING when SELLER updates it', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.status).toBe(ListingStatus.PENDING);

      // Restore status for other tests
      await prisma.listing.update({
        where: { id: approvedListingId },
        data: { status: ListingStatus.APPROVED },
      });
    });

    it('should NOT change status when ADMIN updates listing', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/listings/${approvedListingId}`)
        .set(getAuthHeader(token))
        .send({ title: 'Admin Updated' })
        .expect(200);

      expect(response.body.status).toBe(ListingStatus.APPROVED);
    });
  });

  describe('DELETE /api/v1/listings/:id - Delete Listing with Ownership', () => {
    let deletableListingId: string;

    beforeEach(async () => {
      const listing = await prisma.listing.create({
        data: {
          title: 'Deletable Listing',
          description: 'Test',
          price: 100,
          categoryId,
          sellerId: TEST_USERS.SELLER.id,
          status: ListingStatus.PENDING,
        },
      });
      deletableListingId = listing.id;
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${deletableListingId}`)
        .expect(401);
    });

    it('should deny BUYER from deleting listings', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${deletableListingId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow SELLER to delete their own listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${deletableListingId}`)
        .set(getAuthHeader(token))
        .expect(200);

      const deleted = await prisma.listing.findUnique({
        where: { id: deletableListingId },
      });
      expect(deleted).toBeNull();
    });

    it('should deny SELLER from deleting another sellers listing', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${seller2PendingListingId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow ADMIN to delete any listing', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: 'Admin Deletable',
          description: 'Test',
          price: 100,
          categoryId,
          sellerId: TEST_USERS.SELLER_2.id,
          status: ListingStatus.PENDING,
        },
      });

      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${listing.id}`)
        .set(getAuthHeader(token))
        .expect(200);
    });
  });

  describe('Invalid Token Handling', () => {
    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/listings')
        .set({ Authorization: 'Bearer invalid-token' })
        .expect(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/listings')
        .set({ Authorization: 'InvalidFormat' })
        .expect(401);
    });
  });
});
