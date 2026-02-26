import { Test, TestingModule } from '@nestjs/testing';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Role } from '@app/shared';

describe('ModerationController (unit)', () => {
  let controller: ModerationController;
  const mockModerationService = {
    getQueue: jest.fn(),
    getLogs: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };
  const mockUser = { id: 'u1', email: 'admin@test.com', role: Role.ADMIN };
  const mockReq = { ip: '127.0.0.1' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [{ provide: ModerationService, useValue: mockModerationService }],
    }).compile();

    controller = module.get<ModerationController>(ModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getQueue should call service.getQueue', async () => {
    const queue = [{ id: 'l1', status: 'PENDING' }];
    mockModerationService.getQueue.mockResolvedValue(queue);

    const result = await controller.getQueue();
    expect(mockModerationService.getQueue).toHaveBeenCalled();
    expect(result).toEqual(queue);
  });

  it('getLogs should call service.getLogs', async () => {
    const logs = [{ id: '1', action: 'APPROVED' }];
    mockModerationService.getLogs.mockResolvedValue(logs);

    const result = await controller.getLogs();
    expect(mockModerationService.getLogs).toHaveBeenCalled();
    expect(result).toEqual(logs);
  });

  it('approve should call service.approve', async () => {
    const approved = { id: 'l1', status: 'APPROVED' };
    mockModerationService.approve.mockResolvedValue(approved);

    const result = await controller.approve('l1', mockUser, mockReq as any);
    expect(mockModerationService.approve).toHaveBeenCalledWith('l1', 'u1', '127.0.0.1');
    expect(result).toEqual(approved);
  });

  it('reject should call service.reject', async () => {
    const dto = { reason: 'Spam' };
    const rejected = { id: 'l1', status: 'REJECTED' };
    mockModerationService.reject.mockResolvedValue(rejected);

    const result = await controller.reject('l1', dto, mockUser, mockReq as any);
    expect(mockModerationService.reject).toHaveBeenCalledWith('l1', 'u1', dto, '127.0.0.1');
    expect(result).toEqual(rejected);
  });
});
