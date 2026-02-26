import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  verify: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed'),
}));
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

  describe('login', () => {
    it('should return user and tokens when credentials valid', async () => {
      const user = { id: 'u1', email: 'u@test.com', name: 'Test', role: 'SELLER' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.account.findFirst.mockResolvedValue({ password: 'hashed' });
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login('u@test.com', 'pass');

      expect(result.user).toEqual({ id: 'u1', email: 'u@test.com', name: 'Test', role: 'SELLER' });
      expect(result.tokens).toBeDefined();
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('unknown@test.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login('unknown@test.com', 'pass')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw when account has no password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.com',
        name: 'T',
        role: 'BUYER',
      });
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(service.login('u@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when password invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@test.com',
        name: 'T',
        role: 'BUYER',
      });
      mockPrisma.account.findFirst.mockResolvedValue({ password: 'hash' });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login('u@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user and account and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});
      mockPrisma.account.create.mockResolvedValue({});

      const result = await service.register('new@test.com', 'pass', 'New User', Role.BUYER);

      expect(result.user).toEqual({
        id: expect.any(String),
        email: 'new@test.com',
        name: 'New User',
        role: Role.BUYER,
      });
      expect(result.tokens).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.account.create).toHaveBeenCalled();
    });

    it('should throw when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'e', email: 'exist@test.com' });

      await expect(service.register('exist@test.com', 'pass', 'X', Role.BUYER)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register('exist@test.com', 'pass', 'X', Role.BUYER)).rejects.toThrow(
        'Email already registered',
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = { id: 'u1', name: 'Test', email: 'u@test.com', role: 'ADMIN' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById('u1');
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserById('invalid');
      expect(result).toBeNull();
    });
  });
});
