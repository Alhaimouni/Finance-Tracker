import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto, userId: string): Promise<Category> {
    const category = this.categoriesRepo.create({ ...dto, userId });
    return this.categoriesRepo.save(category);
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string, userId: string): Promise<Category> {
    const category = await this.categoriesRepo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }
}
