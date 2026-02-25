import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

describe('CategoryController (unit)', () => {
  let controller: CategoryController;
  const mockCategoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should call service.findAll', async () => {
    const categories = [{ id: '1', name: 'A', description: null }];
    mockCategoryService.findAll.mockResolvedValue(categories);

    const result = await controller.findAll();
    expect(mockCategoryService.findAll).toHaveBeenCalled();
    expect(result).toEqual(categories);
  });

  it('findOne should call service.findOne with id', async () => {
    const category = { id: '1', name: 'Books', description: null };
    mockCategoryService.findOne.mockResolvedValue(category);

    const result = await controller.findOne('1');
    expect(mockCategoryService.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual(category);
  });

  it('create should call service.create', async () => {
    const dto = { name: 'Books', description: 'Cat', parentId: null };
    const created = { id: 'c1', ...dto };
    mockCategoryService.create.mockResolvedValue(created);

    const result = await controller.create(dto);
    expect(mockCategoryService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('update should call service.update', async () => {
    const dto = { name: 'Updated' };
    const updated = { id: '1', name: 'Updated', description: null };
    mockCategoryService.update.mockResolvedValue(updated);

    const result = await controller.update('1', dto);
    expect(mockCategoryService.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual(updated);
  });

  it('remove should call service.remove', async () => {
    const deleted = { id: '1', name: 'A' };
    mockCategoryService.remove.mockResolvedValue(deleted);

    const result = await controller.remove('1');
    expect(mockCategoryService.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual(deleted);
  });
});
