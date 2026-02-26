import { Test, TestingModule } from '@nestjs/testing';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { Role } from '@app/shared';

describe('ListingController (unit)', () => {
  let controller: ListingController;
  const mockListingService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const mockUser = { id: 'u1', email: 'u@test.com', role: Role.SELLER };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingController],
      providers: [{ provide: ListingService, useValue: mockListingService }],
    }).compile();

    controller = module.get<ListingController>(ListingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should call service.findAll', async () => {
    const items = [{ id: 'l1', title: 'Item' }];
    mockListingService.findAll.mockResolvedValue({ items, total: 1, page: 1, limit: 10, totalPages: 1 });

    const result = await controller.findAll({} as any, mockUser);
    expect(mockListingService.findAll).toHaveBeenCalled();
    expect(result.items).toEqual(items);
  });

  it('findOne should call service.findOne', async () => {
    const listing = { id: 'l1', title: 'Item', status: 'APPROVED' };
    mockListingService.findOne.mockResolvedValue(listing);

    const result = await controller.findOne('l1', mockUser);
    expect(mockListingService.findOne).toHaveBeenCalledWith('l1', mockUser);
    expect(result).toEqual(listing);
  });

  it('create should call service.create with dto and userId', async () => {
    const dto = { title: 'New', description: 'Desc', price: 100, categoryId: 'c1' };
    const created = { id: 'l1', ...dto, sellerId: 'u1', status: 'PENDING' };
    mockListingService.create.mockResolvedValue(created);

    const result = await controller.create(dto, mockUser);
    expect(mockListingService.create).toHaveBeenCalledWith(dto, 'u1');
    expect(result).toEqual(created);
  });

  it('update should call service.update', async () => {
    const dto = { title: 'Updated' };
    const updated = { id: 'l1', title: 'Updated' };
    mockListingService.update.mockResolvedValue(updated);

    const result = await controller.update('l1', dto, mockUser);
    expect(mockListingService.update).toHaveBeenCalledWith('l1', dto, mockUser);
    expect(result).toEqual(updated);
  });

  it('remove should call service.remove', async () => {
    mockListingService.remove.mockResolvedValue(undefined);

    await controller.remove('l1', mockUser);
    expect(mockListingService.remove).toHaveBeenCalledWith('l1', mockUser);
  });
});
