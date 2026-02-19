import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/minio/minio.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  TEST_USERS,
  generateTestToken,
  getAuthHeader,
} from '../../../test/helpers/auth.helper';
const smallestJpeg = require('smallest-jpeg') as Buffer;

describe('Media Service - Authorization Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let minioService: MinioService;
  let testMediaId: string;
  let seller2MediaId: string;
  let testJpegPath: string;

  beforeAll(async () => {
    const buf = Buffer.isBuffer(smallestJpeg) ? smallestJpeg : Buffer.from(smallestJpeg);
    testJpegPath = path.join(os.tmpdir(), `media-test-${Date.now()}.jpg`);
    fs.writeFileSync(testJpegPath, buf);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    minioService = moduleFixture.get<MinioService>(MinioService);

    // Create test media files (unique keys to avoid constraint across runs)
    const uniq = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const testMedia = await prisma.mediaFile.create({
      data: {
        uploadedBy: TEST_USERS.SELLER.id,
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageKey: `test/seller-${uniq}.jpg`,
        status: 'READY',
      },
    });
    testMediaId = testMedia.id;

    const seller2Media = await prisma.mediaFile.create({
      data: {
        uploadedBy: TEST_USERS.SELLER_2.id,
        originalName: 'seller2-image.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        storageKey: `test/seller2-${uniq}.jpg`,
        status: 'READY',
      },
    });
    seller2MediaId = seller2Media.id;
  });

  afterAll(async () => {
    await prisma.mediaFile.deleteMany({});
    if (testJpegPath && fs.existsSync(testJpegPath)) fs.unlinkSync(testJpegPath);
    await app.close();
  });

  describe('GET /api/v1/media/:id - Public Access', () => {
    it('should allow unauthenticated access', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/media/${testMediaId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testMediaId);
    });

    it('should allow BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get(`/api/v1/media/${testMediaId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should allow SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get(`/api/v1/media/${testMediaId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should allow ADMIN access', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .get(`/api/v1/media/${testMediaId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should return 404 for non-existent media', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/media/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /api/v1/media/upload - Upload Access', () => {
    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .attach('file', testJpegPath)
        .expect(401);
    });

    it('should deny BUYER from uploading media', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .attach('file', testJpegPath)
        .expect(403);
    });

    it('should allow SELLER to upload media', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .attach('file', testJpegPath)
        .expect(201);

      expect(response.body.uploadedBy).toBe(TEST_USERS.SELLER.id);
      expect(response.body.id).toBeDefined();

      // Cleanup
      await prisma.mediaFile.delete({ where: { id: response.body.id } });
    });

    it('should allow ADMIN to upload media', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .attach('file', testJpegPath)
        .expect(201);

      expect(response.body.uploadedBy).toBe(TEST_USERS.ADMIN.id);

      // Cleanup
      await prisma.mediaFile.delete({ where: { id: response.body.id } });
    });

    it('should reject invalid file types', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const textBuffer = Buffer.from('This is not an image');

      await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .attach('file', textBuffer, 'test.txt')
        .expect(400);
    });

    it('should reject requests without file', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .expect(400);
    });
  });

  describe('DELETE /api/v1/media/:id - Ownership and Admin Access', () => {
    let deletableMediaId: string;

    beforeEach(async () => {
      const storageKey = `test/deletable-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
      const media = await prisma.mediaFile.create({
        data: {
          uploadedBy: TEST_USERS.SELLER.id,
          originalName: 'deletable.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          storageKey,
          status: 'READY',
        },
      });
      deletableMediaId = media.id;
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${deletableMediaId}`)
        .expect(401);
    });

    it('should deny BUYER from deleting media', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${deletableMediaId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow SELLER to delete their own media', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${deletableMediaId}`)
        .set(getAuthHeader(token))
        .expect(200);

      const deleted = await prisma.mediaFile.findUnique({
        where: { id: deletableMediaId },
      });
      expect(deleted).toBeNull();
    });

    it('should deny SELLER from deleting another sellers media', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${seller2MediaId}`)
        .set(getAuthHeader(token))
        .expect(403);

      // Verify it still exists
      const media = await prisma.mediaFile.findUnique({
        where: { id: seller2MediaId },
      });
      expect(media).not.toBeNull();
    });

    it('should allow ADMIN to delete any media', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${deletableMediaId}`)
        .set(getAuthHeader(token))
        .expect(200);

      const deleted = await prisma.mediaFile.findUnique({
        where: { id: deletableMediaId },
      });
      expect(deleted).toBeNull();
    });

    it('should allow ADMIN to delete other sellers media', async () => {
      const storageKey = `test/admin-deletable-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
      const media = await prisma.mediaFile.create({
        data: {
          uploadedBy: TEST_USERS.SELLER_2.id,
          originalName: 'admin-deletable.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          storageKey,
          status: 'READY',
        },
      });

      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .delete(`/api/v1/media/${media.id}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should return 404 when deleting non-existent media', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .delete('/api/v1/media/non-existent-id')
        .set(getAuthHeader(token))
        .expect(404);
    });
  });

  describe('Media with Listing Association', () => {
    it('should allow uploading media with listingId', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload')
        .set(getAuthHeader(token))
        .query({ listingId: 'test-listing-id' })
        .attach('file', testJpegPath)
        .expect(201);

      expect(response.body.listingId).toBe('test-listing-id');

      // Cleanup
      await prisma.mediaFile.delete({ where: { id: response.body.id } });
    });
  });

  describe('Ownership Guard Error Messages', () => {
    it('should return clear error message for ownership violation', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/media/${seller2MediaId}`)
        .set(getAuthHeader(token))
        .expect(403);

      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('permission');
    });

    it('should return clear error message for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/media/${testMediaId}`)
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent uploads by same user', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const uploads = [
        request(app.getHttpServer())
          .post('/api/v1/media/upload')
          .set(getAuthHeader(token))
          .attach('file', testJpegPath),
        request(app.getHttpServer())
          .post('/api/v1/media/upload')
          .set(getAuthHeader(token))
          .attach('file', testJpegPath),
      ];

      const results = await Promise.all(uploads);

      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.uploadedBy).toBe(TEST_USERS.SELLER.id);
      });

      // Cleanup
      for (const result of results) {
        await prisma.mediaFile.delete({ where: { id: result.body.id } });
      }
    });
  });
});
