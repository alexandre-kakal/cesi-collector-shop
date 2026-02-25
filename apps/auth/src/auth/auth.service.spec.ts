import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { RABBITMQ_CLIENT_TOKEN, RABBITMQ_ROUTING_KEYS, Role } from '@app/shared';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let redisService: RedisService;

  const mockRmq = { emit: jest.fn() };
  const mockJwtService = {
    sign: jest.fn((payload, options?) => 'mock-token-' + payload.sub),
    verify: jest.fn((token) => ({
      sub: 'user-id',
      email: 'test@test.com',
      role: Role.SELLER,
      jti: 'mock-jti',
    })),
  };
  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };
  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    account: { findFirst: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RABBITMQ_CLIENT_TOKEN, useValue: mockRmq },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
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

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const result = await service.generateTokens('user-1', 'test@test.com', Role.SELLER);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should store refresh token in Redis', async () => {
      await service.generateTokens('user-1', 'test@test.com', Role.SELLER);

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh:'),
        expect.any(String),
        7 * 24 * 60 * 60,
      );
    });

    it('should include role in token payload', async () => {
      await service.generateTokens('user-1', 'test@test.com', Role.ADMIN);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
        expect.anything(),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens when refresh token is valid', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', email: 'test@test.com', role: Role.SELLER }),
      );

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should delete old refresh token from Redis', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', email: 'test@test.com', role: Role.SELLER }),
      );

      await service.refreshTokens('valid-refresh-token');

      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('refresh:'));
    });

    it('should throw error when refresh token not found in Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow();
    });
  });

  describe('revokeToken', () => {
    it('should delete token from Redis', async () => {
      await service.revokeToken('valid-token');

      expect(redisService.del).toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.revokeToken('invalid-token')).resolves.not.toThrow();
    });
  });
});
