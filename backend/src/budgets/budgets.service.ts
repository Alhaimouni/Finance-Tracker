import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
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
    const summary = await this.transactionsService.getSummary(
      userId,
      budget.startDate,
      budget.endDate,
    );

    const catEntry = summary.byCategory.find((b) => b.category === budget.category?.name);
    const spent = catEntry?.total ?? 0;
    const remaining = Number(budget.amount) - spent;
    const percentageUsed = Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
    };
  }
}
