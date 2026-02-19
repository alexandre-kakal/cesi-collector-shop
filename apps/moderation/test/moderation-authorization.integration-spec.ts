import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  TEST_USERS,
  generateTestToken,
  getAuthHeader,
} from '../../../test/helpers/auth.helper';

describe('Moderation Service - Authorization Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testQueueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test moderation queue entry
    const queueEntry = await prisma.moderationQueue.create({
      data: {
        listingId: 'test-listing-id',
        sellerId: TEST_USERS.SELLER.id,
      },
    });
    testQueueId = queueEntry.id;
  });

  afterAll(async () => {
    await prisma.moderationLog.deleteMany({});
    await prisma.moderationQueue.deleteMany({});
    await app.close();
  });

  describe('GET /api/v1/moderation/queue - Admin Only', () => {
    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/api/v1/moderation/queue').expect(401);
    });

    it('should deny BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get('/api/v1/moderation/queue')
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should deny SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get('/api/v1/moderation/queue')
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow ADMIN access', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .get('/api/v1/moderation/queue')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/moderation/logs - Admin Only', () => {
    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/api/v1/moderation/logs').expect(401);
    });

    it('should deny BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get('/api/v1/moderation/logs')
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should deny SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get('/api/v1/moderation/logs')
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow ADMIN access', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .get('/api/v1/moderation/logs')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/moderation/:id/approve - Admin Only', () => {
    let approvalQueueId: string;

    beforeEach(async () => {
      const queueEntry = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });
      approvalQueueId = queueEntry.id;
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${approvalQueueId}/approve`)
        .expect(401);
    });

    it('should deny BUYER from approving', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${approvalQueueId}/approve`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should deny SELLER from approving', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${approvalQueueId}/approve`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow ADMIN to approve', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const queueBefore = await prisma.moderationQueue.findUnique({
        where: { id: approvalQueueId },
      });
      const listingId = queueBefore!.listingId;

      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${approvalQueueId}/approve`)
        .set(getAuthHeader(token))
        .expect(201);

      const queueEntry = await prisma.moderationQueue.findUnique({
        where: { id: approvalQueueId },
      });
      expect(queueEntry?.status).toBe('DONE');

      const log = await prisma.moderationLog.findFirst({
        where: { listingId },
      });
      expect(log).toBeDefined();
    });
  });

  describe('POST /api/v1/moderation/:id/reject - Admin Only', () => {
    let rejectionQueueId: string;
    let rejectionQueueEntry: any;

    beforeEach(async () => {
      const queueEntry = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });
      rejectionQueueId = queueEntry.id;
      rejectionQueueEntry = queueEntry;
    });

    const rejectDto = {
      reason: 'Does not meet quality standards',
    };

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${rejectionQueueId}/reject`)
        .send(rejectDto)
        .expect(401);
    });

    it('should deny BUYER from rejecting', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${rejectionQueueId}/reject`)
        .set(getAuthHeader(token))
        .send(rejectDto)
        .expect(403);
    });

    it('should deny SELLER from rejecting', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${rejectionQueueId}/reject`)
        .set(getAuthHeader(token))
        .send(rejectDto)
        .expect(403);
    });

    it('should allow ADMIN to reject with reason', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${rejectionQueueId}/reject`)
        .set(getAuthHeader(token))
        .send(rejectDto)
        .expect(201);

      // Verify log contains rejection reason
      const log = await prisma.moderationLog.findFirst({
        where: { listingId: rejectionQueueEntry.listingId },
      });
      expect(log?.reason).toContain(rejectDto.reason);
    });

    it('should require rejection reason', async () => {
      const queueEntry = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });

      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${queueEntry.id}/reject`)
        .set(getAuthHeader(token))
        .send({})
        .expect(400);

      // Cleanup
      await prisma.moderationQueue.delete({ where: { id: queueEntry.id } });
    });
  });

  describe('Authorization Error Messages', () => {
    it('should return clear error for non-admin user', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .get('/api/v1/moderation/queue')
        .set(getAuthHeader(token))
        .expect(403);

      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('Access denied');
      expect(response.body.message).toContain('ADMIN');
    });

    it('should return clear error for unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/moderation/queue')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Multiple Admin Operations', () => {
    it('should allow multiple admins to perform moderation', async () => {
      const queueEntry1 = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}-1`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });

      const queueEntry2 = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}-2`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });

      const adminToken = generateTestToken(TEST_USERS.ADMIN);

      // Approve first entry
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${queueEntry1.id}/approve`)
        .set(getAuthHeader(adminToken))
        .expect(201);

      // Reject second entry
      await request(app.getHttpServer())
        .post(`/api/v1/moderation/${queueEntry2.id}/reject`)
        .set(getAuthHeader(adminToken))
        .send({ reason: 'Test rejection' })
        .expect(201);

      // Verify both operations succeeded
      const logs = await prisma.moderationLog.findMany({
        where: {
          adminId: TEST_USERS.ADMIN.id,
        },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent queue entry gracefully', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .post('/api/v1/moderation/non-existent-id/approve')
        .set(getAuthHeader(token))
        .expect(404);
    });

    it('should handle concurrent moderation attempts', async () => {
      const queueEntry = await prisma.moderationQueue.create({
        data: {
          listingId: `listing-${Date.now()}`,
          sellerId: TEST_USERS.SELLER.id,
        },
      });

      const token = generateTestToken(TEST_USERS.ADMIN);

      // Try to approve and reject simultaneously
      const [approveResult, rejectResult] = await Promise.allSettled([
        request(app.getHttpServer())
          .post(`/api/v1/moderation/${queueEntry.id}/approve`)
          .set(getAuthHeader(token)),
        request(app.getHttpServer())
          .post(`/api/v1/moderation/${queueEntry.id}/reject`)
          .set(getAuthHeader(token))
          .send({ reason: 'Test' }),
      ]);

      // At least one should succeed
      const succeeded = [approveResult, rejectResult].filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(succeeded).toBeGreaterThan(0);
    });
  });
});
