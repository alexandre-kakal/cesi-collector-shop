import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private isPublicRoute = false;
  private hadAuthHeader = false;

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.path === '/metrics') return true;

    this.isPublicRoute = !!this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (this.isPublicRoute) {
      const authHeader = context.switchToHttp().getRequest().headers?.authorization;
      this.hadAuthHeader = !!(authHeader && /^Bearer\s+\S+/.test(authHeader));
      if (authHeader && !/^Bearer\s+\S+/.test(authHeader)) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      if (!authHeader) return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any) {
    if (this.isPublicRoute) {
      if (err) throw err instanceof Error ? err : new UnauthorizedException('Invalid or expired token');
      if (this.hadAuthHeader && !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      return user ?? null;
    }
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
