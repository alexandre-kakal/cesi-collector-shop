import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    revokeToken: jest.fn(),
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
});
