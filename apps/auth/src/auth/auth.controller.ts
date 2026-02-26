import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role, CurrentUser, RequestUser, JwtAuthGuard, RolesGuard, Roles } from '@app/shared';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body('email') email: string, @Body('password') password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password required');
    }
    return this.authService.login(email, password);
  }

  @Post('register')
  @HttpCode(201)
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
    @Body('role') role?: Role,
  ) {
    if (!email || !password || !name) {
      throw new UnauthorizedException('Email, password and name required');
    }
    return this.authService.register(email, password, name, role ?? Role.BUYER);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: RequestUser) {
    if (!user) throw new UnauthorizedException();
    return { user };
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUser(@Param('id') id: string) {
    const user = await this.authService.getUserById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.authService.refreshTokens(refreshToken ?? '');
    return { tokens };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.authService.revokeToken(refreshToken ?? '');
    return { message: 'Logged out successfully' };
  }
}
