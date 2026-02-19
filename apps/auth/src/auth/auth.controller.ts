import { All, Controller, Logger, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './better-auth.config';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly handler = toNodeHandler(auth);

  constructor(private readonly authService: AuthService) {}

  @All('/api/auth/*')
  async handleBetterAuth(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }

  @All('/api/auth/get-session')
  async getSession(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
