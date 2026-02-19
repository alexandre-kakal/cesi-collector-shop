import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryModule } from './category.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests d'intégration Category (DB réelle).
 * Prérequis: npm run test:setup, puis npm run test:integration
 */
describe('CategoryService (integration)', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        PrismaModule,
        CategoryModule,
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.category.deleteMany({});
  });

  it('should create and find a category', async () => {
    const dto = { name: 'Test Category', description: 'For integration test', parentId: null };
    const created = await service.create(dto);

    expect(created.id).toBeDefined();
    expect(created.name).toBe(dto.name);
    expect(created.description).toBe(dto.description);

    const found = await service.findOne(created.id);
    expect(found.name).toBe(created.name);
  });

  it('should list categories', async () => {
    await service.create({ name: 'A', description: null, parentId: null });
    await service.create({ name: 'B', description: null, parentId: null });

    const list = await service.findAll();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('should update a category', async () => {
    const created = await service.create({ name: 'Original', description: null, parentId: null });
    const updated = await service.update(created.id, { name: 'Updated' });

    expect(updated.name).toBe('Updated');
  });

  it('should remove a category', async () => {
    const created = await service.create({ name: 'ToDelete', description: null, parentId: null });
    await service.remove(created.id);

    await expect(service.findOne(created.id)).rejects.toThrow(NotFoundException);
  });
});
