import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';
import { RedisModule } from '../src/redis/redis.module';
import { RedisService } from '../src/redis/redis.service';
import { Role } from '@app/shared';

describe('Auth Service - JWT Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let redisService: RedisService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: 'apps/auth/.env.test',
        }),
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { algorithm: 'HS256', expiresIn: '15m' },
        }),
        RedisModule,
      ],
      providers: [
        AuthService,
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Token Generation', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = 'test-user-id';
      const email = 'test@test.com';
      const role = Role.SELLER;

      const tokens = await authService.generateTokens(userId, email, role);

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should create valid access token with correct payload', async () => {
      const userId = 'test-user-id';
      const email = 'test@test.com';
      const role = Role.SELLER;

      const tokens = await authService.generateTokens(userId, email, role);
      const payload = jwtService.verify(tokens.accessToken);

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
      expect(payload.jti).toBeDefined();
    });

    it('should store refresh token in Redis', async () => {
      const userId = 'test-user-id';
      const email = 'test@test.com';
      const role = Role.BUYER;

      const tokens = await authService.generateTokens(userId, email, role);
      const payload = jwtService.verify(tokens.refreshToken);

      const stored = await redisService.get(`refresh:${payload.jti}`);
      expect(stored).toBeDefined();

      const storedData = JSON.parse(stored!);
      expect(storedData.userId).toBe(userId);
      expect(storedData.email).toBe(email);
      expect(storedData.role).toBe(role);
    });

    it('should generate tokens for different roles', async () => {
      const roles = [Role.BUYER, Role.SELLER, Role.ADMIN];

      for (const role of roles) {
        const tokens = await authService.generateTokens('user-id', 'user@test.com', role);
        const payload = jwtService.verify(tokens.accessToken);
        expect(payload.role).toBe(role);
      }
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const userId = 'test-user-id';
      const email = 'test@test.com';
      const role = Role.SELLER;

      const originalTokens = await authService.generateTokens(userId, email, role);
      const newTokens = await authService.refreshTokens(originalTokens.refreshToken);

      expect(newTokens).toBeDefined();
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should invalidate old refresh token after refresh', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);
      const oldPayload = jwtService.verify(tokens.refreshToken);

      await authService.refreshTokens(tokens.refreshToken);

      const stored = await redisService.get(`refresh:${oldPayload.jti}`);
      expect(stored).toBeNull();
    });

    it('should reject refresh with invalid token', async () => {
      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow();
    });

    it('should reject refresh with revoked token', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);
      await authService.revokeToken(tokens.refreshToken);

      await expect(authService.refreshTokens(tokens.refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('Token Revocation', () => {
    it('should revoke refresh token', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);
      const payload = jwtService.verify(tokens.refreshToken);

      await authService.revokeToken(tokens.refreshToken);

      const stored = await redisService.get(`refresh:${payload.jti}`);
      expect(stored).toBeNull();
    });

    it('should handle revoking already revoked token gracefully', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);

      await authService.revokeToken(tokens.refreshToken);
      await expect(authService.revokeToken(tokens.refreshToken)).resolves.not.toThrow();
    });

    it('should handle revoking invalid token gracefully', async () => {
      await expect(authService.revokeToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('Token Expiration', () => {
    it('should create access token with 15 minute expiration', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);
      const payload = jwtService.verify(tokens.accessToken);

      const expiresIn = payload.exp! - payload.iat!;
      expect(expiresIn).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should create refresh token with 7 day expiration', async () => {
      const tokens = await authService.generateTokens('user-id', 'user@test.com', Role.SELLER);
      const payload = jwtService.verify(tokens.refreshToken);

      const expiresIn = payload.exp! - payload.iat!;
      expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('Multiple Users', () => {
    it('should handle multiple concurrent token generations', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', role: Role.BUYER },
        { id: 'user2', email: 'user2@test.com', role: Role.SELLER },
        { id: 'user3', email: 'user3@test.com', role: Role.ADMIN },
      ];

      const tokenPromises = users.map((user) =>
        authService.generateTokens(user.id, user.email, user.role),
      );

      const allTokens = await Promise.all(tokenPromises);

      expect(allTokens).toHaveLength(3);
      allTokens.forEach((tokens, index) => {
        const payload = jwtService.verify(tokens.accessToken);
        expect(payload.sub).toBe(users[index].id);
        expect(payload.email).toBe(users[index].email);
        expect(payload.role).toBe(users[index].role);
      });
    });

    it('should maintain separate refresh tokens for different users', async () => {
      const user1Tokens = await authService.generateTokens('user1', 'user1@test.com', Role.BUYER);
      const user2Tokens = await authService.generateTokens(
        'user2',
        'user2@test.com',
        Role.SELLER,
      );

      await authService.revokeToken(user1Tokens.refreshToken);

      // User2's token should still work
      await expect(authService.refreshTokens(user2Tokens.refreshToken)).resolves.toBeDefined();

      // User1's token should be revoked
      await expect(authService.refreshTokens(user1Tokens.refreshToken)).rejects.toThrow();
    });
  });
});
