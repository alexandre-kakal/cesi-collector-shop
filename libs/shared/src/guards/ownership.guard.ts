import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { OWNERSHIP_KEY } from '../decorators/check-ownership.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.getAllAndOverride<string>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resourceType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // ADMIN bypasses ownership checks
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Get resource ID from params
    const resourceId = request.params.id;
    if (!resourceId) {
      throw new ForbiddenException('Resource ID not provided');
    }

    // Get service from the controller instance
    const controllerInstance = context.getClass();
    const controller = this.moduleRef.get(controllerInstance, { strict: false });

    // Try common service property names
    const serviceProperty = resourceType.charAt(0).toLowerCase() + resourceType.slice(1) + 'Service';
    const service = controller[serviceProperty] || controller['service'];

    if (!service || typeof service.checkOwnership !== 'function') {
      throw new Error(
        `Service for ${resourceType} must implement checkOwnership(resourceId: string, userId: string) method`,
      );
    }

    try {
      const isOwner = await service.checkOwnership(resourceId, user.id);

      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Ownership verification failed');
    }
  }
}
