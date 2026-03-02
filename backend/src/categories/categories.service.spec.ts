import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

const USER_ID = 'user-uuid-1';

const mockCategory: Category = {
  id: 'cat-uuid-1',
  name: 'Food & Dining',
  userId: USER_ID,
  user: null as any,
  createdAt: new Date(),
};

const mockCategoryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns the new category', async () => {
      mockCategoryRepo.create.mockReturnValue(mockCategory);
      mockCategoryRepo.save.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'Food & Dining' }, USER_ID);

      expect(mockCategoryRepo.create).toHaveBeenCalledWith({ name: 'Food & Dining', userId: USER_ID });
      expect(result).toEqual(mockCategory);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all categories for the given user', async () => {
      mockCategoryRepo.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll(USER_ID);

      expect(mockCategoryRepo.find).toHaveBeenCalledWith({ where: { userId: USER_ID }, order: { name: 'ASC' } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Food & Dining');
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the category when found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findById('cat-uuid-1', USER_ID);

      expect(result).toEqual(mockCategory);
    });

    it('throws NotFoundException when category does not belong to user', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('cat-uuid-1', USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
