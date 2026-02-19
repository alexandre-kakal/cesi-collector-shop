import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockHandler = jest.fn();

jest.mock('better-auth/node', () => ({
  toNodeHandler: () => mockHandler,
}));

jest.mock('./better-auth.config', () => ({
  auth: {},
}));

describe('AuthController (unit)', () => {
  let controller: AuthController;
  const mockAuthService = { publishUserRegistered: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHandler.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleBetterAuth', () => {
    it('should delegate to better-auth handler with req and res', async () => {
      const req = { url: '/api/auth/sign-in', method: 'POST' } as any;
      const res = { end: jest.fn() } as any;

      await controller.handleBetterAuth(req, res);

      expect(mockHandler).toHaveBeenCalledWith(req, res);
    });
  });

  describe('getSession', () => {
    it('should delegate to better-auth handler', async () => {
      const req = { url: '/api/auth/get-session', method: 'GET' } as any;
      const res = {} as any;

      await controller.getSession(req, res);

      expect(mockHandler).toHaveBeenCalledWith(req, res);
    });
  });
});
