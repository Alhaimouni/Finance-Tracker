import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '../transactions/entities/transaction.entity';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class TransactionEventsListener {
  private readonly logger = new Logger(TransactionEventsListener.name);

  constructor(private readonly budgetsService: BudgetsService) {}

  @OnEvent('transaction.created')
  async handleTransactionCreated(transaction: Transaction) {
    this.logger.log(
      `[EVENT] transaction.created — id=${transaction.id} amount=${transaction.amount} type=${transaction.type}`,
    );
    await this.checkBudgetUsage(transaction);
  }

  @OnEvent('transaction.updated')
  async handleTransactionUpdated(transaction: Transaction) {
    this.logger.log(
      `[EVENT] transaction.updated — id=${transaction.id} amount=${transaction.amount} type=${transaction.type}`,
    );
    await this.checkBudgetUsage(transaction);
  }

  private async checkBudgetUsage(transaction: Transaction) {
    if (transaction.type !== 'expense') return;
    try {
      const budgets = await this.budgetsService.findAll(transaction.userId);
      for (const budget of budgets) {
        if (budget.categoryId !== transaction.categoryId) continue;
        if (
          transaction.date < budget.startDate ||
          transaction.date > budget.endDate
        ) continue;

        const status = await this.budgetsService.getStatus(budget.id, transaction.userId);
        if (status.percentageUsed >= 100) {
          this.logger.warn(
            `[BUDGET EXCEEDED] userId=${transaction.userId} category=${budget.category?.name} spent=${status.spent} budget=${budget.amount}`,
          );
        } else if (status.percentageUsed >= 80) {
          this.logger.warn(
            `[BUDGET WARNING] userId=${transaction.userId} category=${budget.category?.name} at ${status.percentageUsed}% of budget`,
          );
        }
      }
    } catch (err) {
      this.logger.error('Budget check failed', err);
    }
  }
}
