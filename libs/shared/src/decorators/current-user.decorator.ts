import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../interfaces/request-user.interface';

export function getCurrentUserFromRequest(
  data: keyof RequestUser | undefined,
  request: { user?: RequestUser },
): RequestUser | any {
  const user = request.user as RequestUser;
  return data ? user?.[data] : user;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | any =>
    getCurrentUserFromRequest(data, ctx.switchToHttp().getRequest()),
);
