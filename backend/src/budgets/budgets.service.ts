import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepo: Repository<Budget>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(dto: CreateBudgetDto, userId: string): Promise<Budget> {
    const budget = this.budgetsRepo.create({ ...dto, userId });
    return this.budgetsRepo.save(budget);
  }

  async findAll(userId: string): Promise<Budget[]> {
    return this.budgetsRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetsRepo.findOne({ where: { id, userId } });
    if (!budget) throw new NotFoundException(`Budget ${id} not found`);
    return budget;
  }

  async update(id: string, dto: UpdateBudgetDto, userId: string): Promise<Budget> {
    const budget = await this.findById(id, userId);
    Object.assign(budget, dto);
    return this.budgetsRepo.save(budget);
  }

  async remove(id: string, userId: string): Promise<void> {
    const budget = await this.findById(id, userId);
    await this.budgetsRepo.remove(budget);
  }

  async getStatus(id: string, userId: string) {
    const budget = await this.findById(id, userId);

    // Fetch all transactions in the budget period for this category
    const qb = this.transactionsService['transactionsRepo']
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date >= :startDate', { startDate: budget.startDate })
      .andWhere('t.date <= :endDate', { endDate: budget.endDate })
      .andWhere('category.id = :categoryId', { categoryId: budget.categoryId });

    const transactions = await qb.getMany();

    let spent = 0;
    let incomeContributions = 0;
    const incomeItems: { id: string; date: string; amount: number; description: string | null }[] = [];

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (t.type === 'expense') {
        spent += amount;
      } else {
        incomeContributions += amount;
        incomeItems.push({ id: t.id, date: t.date, amount, description: t.description });
      }
    }

    const effectiveBudget = Number(budget.amount) + incomeContributions;
    const remaining = effectiveBudget - spent;
    const percentageUsed = effectiveBudget > 0 ? (spent / effectiveBudget) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      incomeContributions,
      effectiveBudget,
      incomeItems,
    };
  }
}
