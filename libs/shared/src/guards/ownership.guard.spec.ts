import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { OwnershipGuard } from './ownership.guard';
import { OWNERSHIP_KEY } from '../decorators/check-ownership.decorator';
import { Role } from '../enums/role.enum';

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;
  let reflector: Reflector;
  let moduleRef: ModuleRef;

  const createMockContext = (
    user: { id: string; role: string } | null,
    resourceId?: string,
  ): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ListingControllerMock,
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { id: resourceId } }),
      }),
    }) as any;

  const ListingControllerMock = class {
    listingService = {
      checkOwnership: jest.fn().mockResolvedValue(true),
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnershipGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn().mockImplementation((cls) => new ListingControllerMock()),
          },
        },
      ],
    }).compile();

    guard = module.get(OwnershipGuard);
    reflector = module.get(Reflector);
    moduleRef = module.get(ModuleRef);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no OWNERSHIP_KEY', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = await guard.canActivate(createMockContext({ id: 'u1', role: Role.SELLER }));

    expect(result).toBe(true);
  });

  it('should return true when user is ADMIN', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('listing');
    (moduleRef.get as jest.Mock).mockReturnValue(new ListingControllerMock());

    const result = await guard.canActivate(
      createMockContext({ id: 'admin-1', role: Role.ADMIN }, 'listing-1'),
    );

    expect(result).toBe(true);
  });

  it('should throw when user not authenticated', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('listing');
    (moduleRef.get as jest.Mock).mockReturnValue(new ListingControllerMock());

    const ctx = createMockContext(null, 'listing-1');

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('User not authenticated');
  });
});
