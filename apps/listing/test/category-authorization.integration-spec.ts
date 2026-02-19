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

describe('Category Service - Authorization Matrix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCategoryId: string;

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
      data: {
        name: 'Test Category',
        description: 'A test category',
      },
    });
    testCategoryId = category.id;
  });

  afterAll(async () => {
    await prisma.category.deleteMany({});
    await app.close();
  });

  describe('GET /api/v1/categories - Public Access', () => {
    it('should allow unauthenticated access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getAuthHeader(token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getAuthHeader(token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow ADMIN access', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getAuthHeader(token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/categories/:id - Public Access', () => {
    it('should allow unauthenticated access', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategoryId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testCategoryId);
    });

    it('should allow BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should allow SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });

    it('should allow ADMIN access', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .expect(200);
    });
  });

  describe('POST /api/v1/categories - Admin Only', () => {
    const createDto = {
      name: 'New Category',
      description: 'New category description',
    };

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer()).post('/api/v1/categories').send(createDto).expect(401);
    });

    it('should deny BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(403);
    });

    it('should deny SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(403);
    });

    it('should allow ADMIN to create category', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getAuthHeader(token))
        .send(createDto)
        .expect(201);

      expect(response.body.name).toBe(createDto.name);
      expect(response.body.description).toBe(createDto.description);

      // Cleanup
      await prisma.category.delete({ where: { id: response.body.id } });
    });
  });

  describe('PATCH /api/v1/categories/:id - Admin Only', () => {
    const updateDto = {
      name: 'Updated Category',
      description: 'Updated description',
    };

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/categories/${testCategoryId}`)
        .send(updateDto)
        .expect(401);
    });

    it('should deny BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .patch(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(403);
    });

    it('should deny SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .patch(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(403);
    });

    it('should allow ADMIN to update category', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeader(token))
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.description).toBe(updateDto.description);
    });
  });

  describe('DELETE /api/v1/categories/:id - Admin Only', () => {
    let deletableCategoryId: string;

    beforeEach(async () => {
      const uniqueName = `Deletable Category ${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const category = await prisma.category.create({
        data: {
          name: uniqueName,
          description: 'To be deleted',
        },
      });
      deletableCategoryId = category.id;
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${deletableCategoryId}`)
        .expect(401);
    });

    it('should deny BUYER access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${deletableCategoryId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should deny SELLER access', async () => {
      const token = generateTestToken(TEST_USERS.SELLER);
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${deletableCategoryId}`)
        .set(getAuthHeader(token))
        .expect(403);
    });

    it('should allow ADMIN to delete category', async () => {
      const token = generateTestToken(TEST_USERS.ADMIN);
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${deletableCategoryId}`)
        .set(getAuthHeader(token))
        .expect(200);

      const deleted = await prisma.category.findUnique({
        where: { id: deletableCategoryId },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('Authorization Error Messages', () => {
    it('should return clear error message for unauthorized access', async () => {
      const token = generateTestToken(TEST_USERS.BUYER);
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getAuthHeader(token))
        .send({ name: 'Test', description: 'Test' })
        .expect(403);

      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('Access denied');
    });

    it('should return clear error message for missing token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .send({ name: 'Test', description: 'Test' })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });
});
