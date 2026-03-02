import { Module } from '@nestjs/common';
import { TransactionEventsListener } from './transaction-events.listener';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [BudgetsModule],
  providers: [TransactionEventsListener],
})
export class EventsModule {}
