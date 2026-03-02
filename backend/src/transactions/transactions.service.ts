import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTransactionDto, userId: string): Promise<Transaction> {
    const transaction = this.transactionsRepo.create({ ...dto, userId });
    const saved = await this.transactionsRepo.save(transaction);
    this.eventEmitter.emit('transaction.created', saved);
    return saved;
  }

  async findAll(query: QueryTransactionDto, userId: string) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      category,
      type,
      search,
    } = query;

    const qb = this.transactionsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.userId = :userId', { userId });

    if (startDate) qb.andWhere('t.date >= :startDate', { startDate });
    if (endDate) qb.andWhere('t.date <= :endDate', { endDate });
    if (category) qb.andWhere('t.categoryId = :category', { category });
    if (type) qb.andWhere('t.type = :type', { type });
    if (search) {
      qb.andWhere('(category.name ILIKE :search OR t.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const sortField = sortBy === 'createdAt' ? 't.createdAt' : `t.${sortBy}`;
    qb.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string): Promise<Transaction> {
    const t = await this.transactionsRepo.findOne({ where: { id, userId } });
    if (!t) throw new NotFoundException(`Transaction ${id} not found`);
    return t;
  }

  async update(id: string, dto: UpdateTransactionDto, userId: string): Promise<Transaction> {
    const transaction = await this.findById(id, userId);
    Object.assign(transaction, dto);
    const saved = await this.transactionsRepo.save(transaction);
    this.eventEmitter.emit('transaction.updated', saved);
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findById(id, userId);
    await this.transactionsRepo.remove(transaction);
  }

  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const qb = this.transactionsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.userId = :userId', { userId });

    if (startDate) qb.andWhere('t.date >= :startDate', { startDate });
    if (endDate) qb.andWhere('t.date <= :endDate', { endDate });

    const transactions = await qb.getMany();

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategoryMap: Record<string, { category: string; total: number; count: number }> = {};

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (t.type === 'income') totalIncome += amount;
      else totalExpense += amount;

      const catName = t.category?.name ?? 'Unknown';
      if (!byCategoryMap[catName]) byCategoryMap[catName] = { category: catName, total: 0, count: 0 };
      byCategoryMap[catName].total += amount;
      byCategoryMap[catName].count += 1;
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      byCategory: Object.values(byCategoryMap),
    };
  }
}
