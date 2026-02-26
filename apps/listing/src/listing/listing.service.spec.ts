import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ListingService } from './listing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RABBITMQ_CLIENT_TOKEN, ListingStatus, Role, RequestUser } from '@app/shared';

describe('ListingService (unit)', () => {
  let service: ListingService;
  const mockPrisma = {
    listing: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    listingPhoto: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const mockRmq = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = { get: jest.fn((key: string, defaultVal?: string) => defaultVal ?? '') };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RABBITMQ_CLIENT_TOKEN, useValue: mockRmq },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a listing and emit event', async () => {
      const dto = { title: 'Item', description: 'Desc', price: 100, categoryId: 'cat-1' };
      const created = {
        id: 'listing-1',
        ...dto,
        sellerId: 'user-1',
        status: 'PENDING',
        createdAt: new Date(),
        category: null,
        photos: [],
      };
      mockPrisma.listing.create.mockResolvedValue(created);

      const result = await service.create(dto, 'user-1');

      expect(mockPrisma.listing.create).toHaveBeenCalledWith({
        data: { ...dto, sellerId: 'user-1', status: 'PENDING' },
        include: { category: true, photos: true },
      });
      expect(mockRmq.emit).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated listings', async () => {
      const items = [{ id: '1', title: 'A', category: null, photos: [] }];
      mockPrisma.listing.findMany.mockResolvedValue(items);
      mockPrisma.listing.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toMatchObject({ items, total: 1, page: 1, limit: 20, totalPages: 1 });
    });
  });

  describe('findOne', () => {
    it('should return a listing by id when status is APPROVED', async () => {
      const listing = {
        id: '1',
        title: 'A',
        status: ListingStatus.APPROVED,
        sellerId: 'user-1',
        category: null,
        photos: [],
      };
      mockPrisma.listing.findUnique.mockResolvedValue(listing);

      const result = await service.findOne('1');

      expect(result).toEqual(listing);
    });

    it('should return listing when user is ADMIN', async () => {
      const adminUser: RequestUser = { id: 'admin', email: 'admin@test.com', role: Role.ADMIN };
      const listing = {
        id: '1',
        title: 'A',
        status: ListingStatus.PENDING,
        sellerId: 'user-1',
        category: null,
        photos: [],
      };
      mockPrisma.listing.findUnique.mockResolvedValue(listing);

      const result = await service.findOne('1', adminUser);

      expect(result).toEqual(listing);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockUser: RequestUser = {
      id: 'user-1',
      email: 'user@test.com',
      role: Role.SELLER,
    };

    it('should update a listing and return it', async () => {
      const dto = { title: 'Updated' };
      const existing = {
        id: '1',
        title: 'Old',
        status: ListingStatus.PENDING,
        sellerId: 'user-1',
        category: null,
        photos: [],
      };
      const updated = { ...existing, ...dto, status: ListingStatus.PENDING };
      mockPrisma.listing.findUnique.mockResolvedValue(existing);
      mockPrisma.listing.update.mockResolvedValue(updated);

      const result = await service.update('1', dto, mockUser);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ...dto, status: ListingStatus.PENDING },
        include: { category: true, photos: true },
      });
      expect(result).toEqual(updated);
    });

    it('should throw when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid', { title: 'x' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should change APPROVED listing to PENDING when SELLER updates', async () => {
      const dto = { title: 'Updated' };
      const existing = {
        id: '1',
        status: ListingStatus.APPROVED,
        sellerId: 'user-1',
        title: 'Original',
        categoryId: 'cat-1',
        price: 100,
        createdAt: new Date(),
        category: null,
        photos: [],
      };
      const updated = { ...existing, ...dto, status: ListingStatus.PENDING };
      mockPrisma.listing.findUnique.mockResolvedValue(existing);
      mockPrisma.listing.update.mockResolvedValue(updated);

      await service.update('1', dto, mockUser);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ...dto, status: ListingStatus.PENDING },
        include: { category: true, photos: true },
      });
      expect(mockRmq.emit).toHaveBeenCalled();
    });

    it('should NOT change status when ADMIN updates APPROVED listing', async () => {
      const adminUser: RequestUser = { id: 'admin-1', email: 'admin@test.com', role: Role.ADMIN };
      const dto = { title: 'Updated' };
      const existing = {
        id: '1',
        status: ListingStatus.APPROVED,
        sellerId: 'user-1',
        category: null,
        photos: [],
      };
      const updated = { ...existing, ...dto };
      mockPrisma.listing.findUnique.mockResolvedValue(existing);
      mockPrisma.listing.update.mockResolvedValue(updated);

      await service.update('1', dto, adminUser);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ...dto, status: ListingStatus.APPROVED },
        include: { category: true, photos: true },
      });
    });
  });

  describe('remove', () => {
    it('should delete a listing', async () => {
      const listing = {
        id: '1',
        status: ListingStatus.APPROVED,
        sellerId: 'user-1',
        category: null,
        photos: [],
      };
      const user: RequestUser = { id: 'user-1', email: 'u@test.com', role: Role.SELLER };
      mockPrisma.listing.findUnique.mockResolvedValue(listing);
      mockPrisma.listing.delete.mockResolvedValue({ id: '1' });

      await service.remove('1', user);

      expect(mockPrisma.listing.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('updateStatus', () => {
    it('should update listing status', async () => {
      const updated = { id: '1', status: ListingStatus.APPROVED };
      mockPrisma.listing.update.mockResolvedValue(updated);

      const result = await service.updateStatus('1', ListingStatus.APPROVED);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: ListingStatus.APPROVED },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('getNextPhotoOrder', () => {
    it('should return 0 when no photos exist', async () => {
      mockPrisma.listingPhoto.findFirst.mockResolvedValue(null);

      const result = await service.getNextPhotoOrder('l1');

      expect(result).toBe(0);
    });

    it('should return last order + 1 when photos exist', async () => {
      mockPrisma.listingPhoto.findFirst.mockResolvedValue({ order: 2 });

      const result = await service.getNextPhotoOrder('l1');

      expect(result).toBe(3);
    });
  });

  describe('addPhoto', () => {
    it('should create listing photo with default order', async () => {
      const created = { listingId: 'l1', mediaId: 'm1', order: 0 };
      mockPrisma.listingPhoto.create.mockResolvedValue(created);

      const result = await service.addPhoto('l1', 'm1');

      expect(mockPrisma.listingPhoto.create).toHaveBeenCalledWith({
        data: { listingId: 'l1', mediaId: 'm1', order: 0 },
      });
      expect(result).toEqual(created);
    });

    it('should create listing photo with custom order', async () => {
      mockPrisma.listingPhoto.create.mockResolvedValue({
        listingId: 'l1',
        mediaId: 'm1',
        order: 2,
      });

      await service.addPhoto('l1', 'm1', 2);

      expect(mockPrisma.listingPhoto.create).toHaveBeenCalledWith({
        data: { listingId: 'l1', mediaId: 'm1', order: 2 },
      });
    });
  });
});
