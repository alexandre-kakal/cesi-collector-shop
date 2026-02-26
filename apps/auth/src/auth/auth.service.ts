import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import {
  RABBITMQ_CLIENT_TOKEN,
  RABBITMQ_ROUTING_KEYS,
  UserRegisteredEvent,
  Role,
  JwtPayload,
} from '@app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT_TOKEN)
    private readonly rmqClient: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    user: { id: string; email: string; name: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const account = await this.prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });
    if (!account?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(account.password, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as Role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
    role: Role,
  ): Promise<{
    user: { id: string; email: string; name: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const now = new Date();
    const userId = uuidv4();
    const accountId = uuidv4();
    const passwordHash = await argon2.hash(password);

    await this.prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: false,
        role,
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.prisma.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.publishUserRegistered(userId, email, role);
    const tokens = await this.generateTokens(userId, email, role);
    return {
      user: { id: userId, email, name, role },
      tokens,
    };
  }

  async getUserById(
    userId: string,
  ): Promise<{ id: string; name: string; email: string; role: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  async publishUserRegistered(userId: string, email: string, role: string): Promise<void> {
    const event: UserRegisteredEvent = {
      userId,
      email,
      role,
      registeredAt: new Date(),
    };

    this.rmqClient.emit(RABBITMQ_ROUTING_KEYS.USER_REGISTERED, event);
    this.logger.log(`Published user.registered event for userId: ${userId}`);
  }

  async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      jti: accessJti,
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      jti: refreshJti,
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });

    // Store refresh token in Redis with 7 day TTL
    await this.redisService.set(
      `refresh:${refreshJti}`,
      JSON.stringify({ userId, email, role }),
      7 * 24 * 60 * 60, // 7 days in seconds
    );

    this.logger.log(`Generated tokens for user ${userId}`);
    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      if (!payload.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token exists in Redis
      const storedData = await this.redisService.get(`refresh:${payload.jti}`);
      if (!storedData) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Invalidate old refresh token
      await this.redisService.del(`refresh:${payload.jti}`);

      // Generate new tokens
      return this.generateTokens(payload.sub, payload.email, payload.role);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeToken(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      if (payload.jti) {
        await this.redisService.del(`refresh:${payload.jti}`);
        this.logger.log(`Revoked refresh token for user ${payload.sub}`);
      }
    } catch (error) {
      this.logger.error(`Token revocation failed: ${error.message}`);
    }
  }
}
