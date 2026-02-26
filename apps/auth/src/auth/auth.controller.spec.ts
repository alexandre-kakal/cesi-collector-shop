import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotFoundException } from '@nestjs/common';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    revokeToken: jest.fn(),
    getUserById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with email and password', async () => {
      const result = {
        user: { id: '1', email: 'u@test.com', name: 'Test', role: 'BUYER' },
        tokens: { accessToken: 'a', refreshToken: 'r' },
      };
      mockAuthService.login.mockResolvedValue(result);

      const out = await controller.login('u@test.com', 'pass');
      expect(mockAuthService.login).toHaveBeenCalledWith('u@test.com', 'pass');
      expect(out).toEqual(result);
    });

    it('should throw when email or password missing', async () => {
      await expect(controller.login('', 'pass')).rejects.toThrow(UnauthorizedException);
      await expect(controller.login('u@test.com', '')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should call authService.register with correct params', async () => {
      const result = {
        user: { id: '1', email: 'u@test.com', name: 'Test', role: 'BUYER' },
        tokens: { accessToken: 'a', refreshToken: 'r' },
      };
      mockAuthService.register.mockResolvedValue(result);

      const out = await controller.register('u@test.com', 'pass', 'Test', undefined);
      expect(mockAuthService.register).toHaveBeenCalledWith('u@test.com', 'pass', 'Test', 'BUYER');
      expect(out).toEqual(result);
    });

    it('should throw when required fields missing', async () => {
      await expect(controller.register('', 'pass', 'Test', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.register('u@test.com', '', 'Test', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.register('u@test.com', 'pass', '', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens and return tokens', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      const out = await controller.refresh('refresh-token');
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('refresh-token');
      expect(out).toEqual({ tokens });
    });
  });

  describe('logout', () => {
    it('should call authService.revokeToken and return message', async () => {
      mockAuthService.revokeToken.mockResolvedValue(undefined);

      const out = await controller.logout('refresh-token');
      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('refresh-token');
      expect(out).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('me', () => {
    it('should return user when authenticated', async () => {
      const user = { id: '1', email: 'u@test.com', role: 'BUYER' };
      const out = await controller.me(user as any);
      expect(out).toEqual({ user });
    });

    it('should throw when user is null', async () => {
      await expect(controller.me(null as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      const user = { id: '1', name: 'Test', email: 'u@test.com', role: 'ADMIN' };
      mockAuthService.getUserById.mockResolvedValue(user);

      const out = await controller.getUser('1');
      expect(mockAuthService.getUserById).toHaveBeenCalledWith('1');
      expect(out).toEqual({ user });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockAuthService.getUserById.mockResolvedValue(null);

      await expect(controller.getUser('invalid')).rejects.toThrow(NotFoundException);
      await expect(controller.getUser('invalid')).rejects.toThrow('User invalid not found');
    });
  });
});
