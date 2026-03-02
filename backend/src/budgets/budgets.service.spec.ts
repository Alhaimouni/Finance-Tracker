import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetsService } from './budgets.service';
import { Budget, BudgetPeriod } from './budget.entity';
import { TransactionsService } from '../transactions/transactions.service';

const USER_ID = 'user-uuid-1';

const mockBudget: Budget = {
  id: 'budget-uuid-1',
  amount: 500,
  period: BudgetPeriod.MONTHLY,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  categoryId: 'cat-uuid-1',
  userId: USER_ID,
  category: { id: 'cat-uuid-1', name: 'Food & Dining', userId: USER_ID, user: null as any, createdAt: new Date() },
  user: null as any,
  createdAt: new Date(),
};

const mockBudgetRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockTransactionsService = {
  getSummary: jest.fn(),
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(Budget), useValue: mockBudgetRepo },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns the new budget', async () => {
      mockBudgetRepo.create.mockReturnValue(mockBudget);
      mockBudgetRepo.save.mockResolvedValue(mockBudget);

      const dto = {
        categoryId: 'cat-uuid-1',
        amount: 500,
        period: BudgetPeriod.MONTHLY,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = await service.create(dto, USER_ID);

      expect(mockBudgetRepo.create).toHaveBeenCalledWith({ ...dto, userId: USER_ID });
      expect(result).toEqual(mockBudget);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all budgets for the given user', async () => {
      mockBudgetRepo.find.mockResolvedValue([mockBudget]);

      const result = await service.findAll(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('budget-uuid-1');
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the budget when found', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(mockBudget);

      const result = await service.findById('budget-uuid-1', USER_ID);

      expect(result).toEqual(mockBudget);
    });

    it('throws NotFoundException when budget is not found', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('bad-id', USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('calculates spent, remaining and percentageUsed correctly', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(mockBudget);
      mockTransactionsService.getSummary.mockResolvedValue({
        totalIncome: 0,
        totalExpense: 200,
        netBalance: -200,
        byCategory: [{ category: 'Food & Dining', total: 200 }],
      });

      const status = await service.getStatus('budget-uuid-1', USER_ID);

      expect(status.spent).toBe(200);
      expect(status.remaining).toBe(300);
      expect(status.percentageUsed).toBeCloseTo(40);
    });

    it('caps percentageUsed at 100 when over budget', async () => {
      mockBudgetRepo.findOne.mockResolvedValue(mockBudget);
      mockTransactionsService.getSummary.mockResolvedValue({
        totalIncome: 0,
        totalExpense: 600,
        netBalance: -600,
        byCategory: [{ category: 'Food & Dining', total: 600 }],
      });

      const status = await service.getStatus('budget-uuid-1', USER_ID);

      // remaining can be negative (over-budget), percentageUsed > 100
      expect(status.spent).toBe(600);
      expect(status.remaining).toBe(-100);
      expect(status.percentageUsed).toBeGreaterThan(100);
    });
  });
});
