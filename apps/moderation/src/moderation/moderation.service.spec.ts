import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { RABBITMQ_CLIENT_TOKEN } from '@app/shared';

describe('ModerationService (unit)', () => {
  let service: ModerationService;
  const mockPrisma = {
    moderationQueue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    moderationLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const mockRmq = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RABBITMQ_CLIENT_TOKEN, useValue: mockRmq },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQueue', () => {
    it('should return waiting items', async () => {
      const items = [{ id: '1', listingId: 'l1', status: 'WAITING' }];
      mockPrisma.moderationQueue.findMany.mockResolvedValue(items);

      const result = await service.getQueue();

      expect(mockPrisma.moderationQueue.findMany).toHaveBeenCalledWith({
        where: { status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(items);
    });
  });

  describe('enqueue', () => {
    it('should upsert queue item', async () => {
      const created = { id: '1', listingId: 'l1', sellerId: 's1', status: 'WAITING' };
      mockPrisma.moderationQueue.upsert.mockResolvedValue(created);

      const result = await service.enqueue('l1', 's1');

      expect(mockPrisma.moderationQueue.upsert).toHaveBeenCalledWith({
        where: { listingId: 'l1' },
        update: { status: 'WAITING' },
        create: { listingId: 'l1', sellerId: 's1', status: 'WAITING' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('getLogs', () => {
    it('should return logs with default limit', async () => {
      const logs = [{ id: '1', action: 'APPROVE', listingId: 'l1' }];
      mockPrisma.moderationLog.findMany.mockResolvedValue(logs);

      const result = await service.getLogs();

      expect(mockPrisma.moderationLog.findMany).toHaveBeenCalledWith({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(logs);
    });

    it('should return logs with custom limit', async () => {
      mockPrisma.moderationLog.findMany.mockResolvedValue([]);

      await service.getLogs(10);

      expect(mockPrisma.moderationLog.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('approve', () => {
    it('should throw when queue item not found', async () => {
      mockPrisma.moderationQueue.findUnique.mockResolvedValue(null);

      await expect(service.approve('invalid', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should update queue, create log, emit event and return success', async () => {
      const item = { id: 'q1', listingId: 'l1', status: 'WAITING' };
      mockPrisma.moderationQueue.findUnique.mockResolvedValue(item);
      mockPrisma.moderationQueue.update.mockResolvedValue({ ...item, status: 'DONE' });
      mockPrisma.moderationLog.create.mockResolvedValue({});

      const result = await service.approve('q1', 'admin-1', '127.0.0.1');

      expect(mockPrisma.moderationQueue.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { status: 'DONE' },
      });
      expect(mockPrisma.moderationLog.create).toHaveBeenCalledWith({
        data: { adminId: 'admin-1', listingId: 'l1', action: 'APPROVE', ipAddress: '127.0.0.1' },
      });
      expect(mockRmq.emit).toHaveBeenCalled();
      expect(result).toEqual({ success: true, listingId: 'l1' });
    });
  });

  describe('reject', () => {
    it('should throw when queue item not found', async () => {
      mockPrisma.moderationQueue.findUnique.mockResolvedValue(null);

      await expect(service.reject('invalid', 'admin-1', { reason: 'spam' })).rejects.toThrow(NotFoundException);
    });

    it('should update queue, create log with reason, emit event and return success', async () => {
      const item = { id: 'q1', listingId: 'l1', status: 'WAITING' };
      mockPrisma.moderationQueue.findUnique.mockResolvedValue(item);
      mockPrisma.moderationQueue.update.mockResolvedValue({ ...item, status: 'DONE' });
      mockPrisma.moderationLog.create.mockResolvedValue({});

      const result = await service.reject('q1', 'admin-1', { reason: 'spam' }, '127.0.0.1');

      expect(mockPrisma.moderationLog.create).toHaveBeenCalledWith({
        data: { adminId: 'admin-1', listingId: 'l1', action: 'REJECT', reason: 'spam', ipAddress: '127.0.0.1' },
      });
      expect(mockRmq.emit).toHaveBeenCalled();
      expect(result).toEqual({ success: true, listingId: 'l1' });
    });
  });
});
