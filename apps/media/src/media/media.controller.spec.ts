import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Role } from '@app/shared';

describe('MediaController (unit)', () => {
  let controller: MediaController;
  const mockMediaService = {
    upload: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const mockUser = { id: 'u1', email: 'u@test.com', role: Role.SELLER };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findOne should call service.findOne', async () => {
    const media = { id: 'mf1', storageKey: 'k', originalUrl: 'http://minio/k', variants: [] };
    mockMediaService.findOne.mockResolvedValue(media);

    const result = await controller.findOne('mf1');
    expect(mockMediaService.findOne).toHaveBeenCalledWith('mf1');
    expect(result).toEqual(media);
  });

  it('upload should throw when no file', async () => {
    await expect(controller.upload(undefined as any, mockUser)).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.upload(undefined as any, mockUser)).rejects.toThrow('No file provided');
  });

  it('upload should call service.upload when file provided', async () => {
    const file = {
      mimetype: 'image/jpeg',
      originalname: 'a.jpg',
      buffer: Buffer.from(''),
    } as Express.Multer.File;
    const uploaded = { id: 'mf1', status: 'PROCESSING' };
    mockMediaService.upload.mockResolvedValue(uploaded);

    const result = await controller.upload(file, mockUser, undefined);
    expect(mockMediaService.upload).toHaveBeenCalledWith(file, 'u1', undefined);
    expect(result).toEqual(uploaded);
  });

  it('remove should call service.remove', async () => {
    mockMediaService.remove.mockResolvedValue(undefined);

    await controller.remove('mf1');
    expect(mockMediaService.remove).toHaveBeenCalledWith('mf1');
  });
});
