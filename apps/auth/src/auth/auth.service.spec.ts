import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RABBITMQ_CLIENT_TOKEN, RABBITMQ_ROUTING_KEYS } from '@app/shared';

describe('AuthService (unit)', () => {
  let service: AuthService;
  const mockRmq = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RABBITMQ_CLIENT_TOKEN, useValue: mockRmq },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishUserRegistered', () => {
    it('should emit USER_REGISTERED event with payload', async () => {
      await service.publishUserRegistered('user-1', 'u@test.com', 'SELLER');

      expect(mockRmq.emit).toHaveBeenCalledWith(
        RABBITMQ_ROUTING_KEYS.USER_REGISTERED,
        expect.objectContaining({
          userId: 'user-1',
          email: 'u@test.com',
          role: 'SELLER',
          registeredAt: expect.any(Date),
        }),
      );
    });

    it('should log when publishing', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.publishUserRegistered('user-2', 'a@b.com', 'BUYER');

      expect(logSpy).toHaveBeenCalledWith('Published user.registered event for userId: user-2');
      logSpy.mockRestore();
    });
  });
});
