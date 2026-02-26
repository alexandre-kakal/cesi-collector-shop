import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

const parentCanActivate = jest.fn().mockResolvedValue(true);

jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(
    () =>
      class MockAuthGuard {
        canActivate = parentCanActivate;
      },
  ),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    parentCanActivate.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should call parent when route is not public', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await guard.canActivate(createMockContext());

      expect(parentCanActivate).toHaveBeenCalled();
    });

    it('should return true for public route without auth header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(createMockContext({}));

      expect(result).toBe(true);
    });

    it('should call parent for public route with valid Bearer token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      await guard.canActivate(createMockContext({ authorization: 'Bearer valid-token-123' }));

      expect(parentCanActivate).toHaveBeenCalled();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authenticated (non-public)', () => {
      const user = { id: 'u1', email: 'u@test.com' };
      expect(guard.handleRequest(null, user, null)).toEqual(user);
    });

    it('should throw when not authenticated on protected route', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow();
      expect(() => guard.handleRequest(new Error('invalid'), null, null)).toThrow();
    });

    it('should return null for public route without user', () => {
      (guard as any).isPublicRoute = true;
      (guard as any).hadAuthHeader = false;

      expect(guard.handleRequest(null, null, null)).toBeNull();
    });

    it('should throw when public route had auth header but token invalid', () => {
      (guard as any).isPublicRoute = true;
      (guard as any).hadAuthHeader = true;

      expect(() => guard.handleRequest(null, null, null)).toThrow();
    });
  });
});
