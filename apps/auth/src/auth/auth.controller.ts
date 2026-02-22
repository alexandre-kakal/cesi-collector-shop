import { All, Controller, Logger, Req, Res, Post, Body, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './better-auth.config';
import { AuthService } from './auth.service';
import { Role } from '@app/shared';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly handler = toNodeHandler(auth);

  constructor(private readonly authService: AuthService) {}

  @All('/api/auth/sign-in/email')
  async handleSignIn(@Req() req: Request, @Res() res: Response) {
    const originalJson = res.json.bind(res);
    const authService = this.authService;
    const logger = this.logger;

    res.json = function (body: any) {
      if (body && body.user && body.session) {
        const userId = body.user.id;
        const email = body.user.email;
        const role = (body.user.role as Role) || Role.BUYER;
        authService.generateTokens(userId, email, role).then((tokens) => {
          body.tokens = tokens;
          originalJson(body);
        }).catch((error) => {
          logger.error(`Failed to generate tokens: ${error.message}`);
          originalJson(body);
        });
      } else {
        return originalJson(body);
      }
    } as any;

    return this.handler(req, res);
  }

  @Post('/api/auth/refresh')
  @HttpCode(200)
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.authService.refreshTokens(refreshToken);
    return { tokens };
  }

  @Post('/api/auth/logout')
  @HttpCode(200)
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.authService.revokeToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  @All('/api/auth/*')
  async handleBetterAuth(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }

  @All('/api/auth/get-session')
  async getSession(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
