import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoryService (unit)', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  const mockPrisma = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    listing: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const dto = { name: 'Books', description: 'Books category', parentId: null };
      const created = { id: 'uuid-1', ...dto, parent: null, children: [] };
      mockPrisma.category.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: dto,
        include: {
          parent: true,
          children: true,
          _count: { select: { listings: true } },
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      const categories = [
        { id: '1', name: 'A', description: null, parentId: null, parent: null, children: [] },
      ];
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        include: {
          parent: true,
          children: true,
          _count: { select: { listings: true } },
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(categories);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const category = {
        id: '1',
        name: 'A',
        description: null,
        parentId: null,
        parent: null,
        children: [],
        listings: [],
      };
      mockPrisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findOne('1');

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          parent: true,
          children: true,
          listings: { take: 10 },
          _count: { select: { listings: true } },
        },
      });
      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid')).rejects.toThrow('Category invalid not found');
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const dto = { name: 'Updated' };
      const updated = {
        id: '1',
        name: 'Updated',
        description: null,
        parentId: null,
        parent: null,
        children: [],
      };
      mockPrisma.category.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.category.update.mockResolvedValue(updated);

      const result = await service.update('1', dto);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: dto,
        include: {
          parent: true,
          children: true,
          _count: { select: { listings: true } },
        },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delete a category when no listings or children', async () => {
      const category = {
        id: '1',
        name: 'A',
        description: null,
        parentId: null,
        parent: null,
        children: [],
        listings: [],
      };
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.listing.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(category);

      const result = await service.remove('1');

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(category);
    });

    it('should throw ConflictException when category has listings', async () => {
      const category = {
        id: '1',
        name: 'A',
        description: null,
        parentId: null,
        parent: null,
        children: [],
        listings: [],
      };
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.listing.count.mockResolvedValue(2);
      mockPrisma.category.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when category has children', async () => {
      const category = {
        id: '1',
        name: 'A',
        description: null,
        parentId: null,
        parent: null,
        children: [],
        listings: [],
      };
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.listing.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(1);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
