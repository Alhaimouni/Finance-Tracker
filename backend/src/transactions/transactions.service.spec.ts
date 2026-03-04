import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionType } from './entities/transaction.entity';

const USER_ID = 'user-uuid-1';

const mockTransaction: Transaction = {
  id: 'tx-uuid-1',
  amount: 100,
  date: '2024-01-15',
  type: TransactionType.EXPENSE,
  description: 'Groceries',
  userId: USER_ID,
  categoryId: 'cat-uuid-1',
  category: { id: 'cat-uuid-1', name: 'Food & Dining', userId: USER_ID, user: null as any, createdAt: new Date() },
  user: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Query builder chain mock
const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const mockEventEmitter = { emit: jest.fn() };

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('saves the transaction and emits transaction.created', async () => {
      mockRepo.create.mockReturnValue(mockTransaction);
      mockRepo.save.mockResolvedValue(mockTransaction);

      const dto = {
        amount: 100,
        categoryId: 'cat-uuid-1',
        date: '2024-01-15',
        type: TransactionType.EXPENSE,
      };

      const result = await service.create(dto, USER_ID);

      expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, userId: USER_ID });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('transaction.created', mockTransaction);
      expect(result).toEqual(mockTransaction);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with pagination meta', async () => {
      const result = await service.findAll({}, USER_ID);

      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the transaction when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findById('tx-uuid-1', USER_ID);

      expect(result).toEqual(mockTransaction);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tx-uuid-1', userId: USER_ID } });
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('bad-id', USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates fields and emits transaction.updated', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockTransaction });
      const updated = { ...mockTransaction, description: 'Monthly groceries' };
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update('tx-uuid-1', { description: 'Monthly groceries' }, USER_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('transaction.updated', updated);
      expect(result.description).toBe('Monthly groceries');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the transaction after confirming ownership', async () => {
      mockRepo.findOne.mockResolvedValue(mockTransaction);
      mockRepo.remove.mockResolvedValue(mockTransaction);

      await service.remove('tx-uuid-1', USER_ID);

      expect(mockRepo.remove).toHaveBeenCalledWith(mockTransaction);
    });

    it('throws NotFoundException when transaction does not exist for user', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('bad-id', USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
