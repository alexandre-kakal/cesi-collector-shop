import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SharpService } from '../processing/sharp.service';
import { RABBITMQ_CLIENT_TOKEN } from '@app/shared';

describe('MediaService (unit)', () => {
  let service: MediaService;
  const mockPrisma = {
    mediaFile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    mediaVariant: { create: jest.fn() },
  };
  const mockMinio = { upload: jest.fn(), getPublicUrl: jest.fn((key: string) => `http://minio/${key}`) };
  const mockSharp = { generateVariants: jest.fn() };
  const mockRmq = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: SharpService, useValue: mockSharp },
        { provide: RABBITMQ_CLIENT_TOKEN, useValue: mockRmq },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should reject non-image mime types', async () => {
      const file = { mimetype: 'application/pdf', originalname: 'a.pdf', size: 100, buffer: Buffer.from('') } as Express.Multer.File;

      await expect(service.upload(file, 'user-1')).rejects.toThrow(BadRequestException);
      await expect(service.upload(file, 'user-1')).rejects.toThrow('Only JPEG, PNG, and WebP images are allowed');
    });

    it('should create mediaFile and upload when mime is allowed', async () => {
      const file = { mimetype: 'image/jpeg', originalname: 'photo.jpg', size: 100, buffer: Buffer.from('') } as Express.Multer.File;
      const mediaFile = { id: 'mf-1', storageKey: 'originals/uuid-photo.jpg', status: 'PROCESSING' };
      mockPrisma.mediaFile.create.mockResolvedValue(mediaFile);
      mockPrisma.mediaFile.update.mockResolvedValue({ ...mediaFile, status: 'READY' });
      mockMinio.upload.mockResolvedValue(undefined);
      mockSharp.generateVariants.mockResolvedValue([]);

      const result = await service.upload(file, 'user-1');

      expect(mockPrisma.mediaFile.create).toHaveBeenCalled();
      expect(mockMinio.upload).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create variants, upload to minio, update READY and emit event', async () => {
      const file = { mimetype: 'image/png', originalname: 'img.png', size: 200, buffer: Buffer.from('png') } as Express.Multer.File;
      const mediaFile = { id: 'mf-2', storageKey: 'originals/abc-img.png', status: 'PROCESSING' };
      const variants = [
        { type: 'THUMB', buffer: Buffer.from(''), width: 100, height: 100, size: 500 },
      ];
      mockPrisma.mediaFile.create.mockResolvedValue(mediaFile);
      mockPrisma.mediaFile.update.mockResolvedValue({ ...mediaFile, status: 'READY' });
      mockPrisma.mediaVariant.create.mockResolvedValue({});
      mockMinio.upload.mockResolvedValue(undefined);
      mockSharp.generateVariants.mockResolvedValue(variants);
      mockMinio.getPublicUrl.mockImplementation((key: string) => `http://minio/${key}`);

      const result = await service.upload(file, 'user-1', 'listing-1');

      expect(mockMinio.upload).toHaveBeenCalledTimes(2);
      expect(mockPrisma.mediaVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mediaFileId: 'mf-2',
          variantType: 'THUMB',
          storageKey: expect.stringContaining('variants/mf-2/thumb.webp'),
          width: 100,
          height: 100,
          size: 500,
        }),
      });
      expect(mockPrisma.mediaFile.update).toHaveBeenCalledWith({
        where: { id: 'mf-2' },
        data: { status: 'READY' },
      });
      expect(mockRmq.emit).toHaveBeenCalled();
      expect(result.status).toBe('READY');
      expect(result.variants).toHaveLength(1);
    });

    it('should set status FAILED and rethrow when processing fails', async () => {
      const file = { mimetype: 'image/jpeg', originalname: 'x.jpg', size: 100, buffer: Buffer.from('') } as Express.Multer.File;
      const mediaFile = { id: 'mf-3', storageKey: 'originals/x.jpg', status: 'PROCESSING' };
      mockPrisma.mediaFile.create.mockResolvedValue(mediaFile);
      mockMinio.upload.mockResolvedValue(undefined);
      mockSharp.generateVariants.mockRejectedValue(new Error('sharp failed'));
      mockPrisma.mediaFile.update.mockResolvedValue({ ...mediaFile, status: 'FAILED' });
      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.upload(file, 'user-1')).rejects.toThrow('sharp failed');
      logSpy.mockRestore();
      expect(mockPrisma.mediaFile.update).toHaveBeenCalledWith({
        where: { id: 'mf-3' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('findOne', () => {
    it('should return media file with variants', async () => {
      const mediaFile = { id: 'mf-1', storageKey: 'k', variants: [] };
      mockPrisma.mediaFile.findUnique.mockResolvedValue(mediaFile);

      const result = await service.findOne('mf-1');

      expect(mockPrisma.mediaFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'mf-1' },
        include: { variants: true },
      });
      expect(result).toEqual(mediaFile);
    });
  });
});
