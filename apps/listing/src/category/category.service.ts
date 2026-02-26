import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: dto,
      include: {
        parent: true,
        children: true,
        _count: { select: { listings: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: { select: { listings: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        listings: { take: 10 },
        _count: { select: { listings: true } },
      },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        parent: true,
        children: true,
        _count: { select: { listings: true } },
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    const [listingsCount, childrenCount] = await Promise.all([
      this.prisma.listing.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);
    if (listingsCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer la catégorie "${category.name}" : ${listingsCount} annonce(s) l'utilisent encore.`,
      );
    }
    if (childrenCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer la catégorie "${category.name}" : elle contient ${childrenCount} sous-catégorie(s). Supprimez-les d'abord.`,
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
