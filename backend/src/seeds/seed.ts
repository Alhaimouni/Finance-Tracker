/**
 * Seed script – run with:
 *   npm run seed
 *
 * Creates a demo user, default categories, and sample transactions.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Transaction, TransactionType } from '../transactions/transaction.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  entities: [User, Category, Transaction],
  logging: false,
});

// ─── Seed data definitions ────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Food & Dining',
  'Transport',
  'Utilities',
  'Rent',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Travel',
  'Other',
];

function randomBetween(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await AppDataSource.initialize();
  console.log('✅  DB connected');

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  // ── 1. Demo user ─────────────────────────────────────────────────────────
  let user = await userRepo.findOneBy({ email: 'demo@finance.dev' });
  if (!user) {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    user = userRepo.create({
      email: 'demo@finance.dev',
      passwordHash,
      name: 'Demo User',
    });
    await userRepo.save(user);
    console.log('✅  Demo user created  (email: demo@finance.dev  password: Password123!)');
  } else {
    console.log('ℹ️   Demo user already exists — skipping');
  }

  // ── 2. Categories ────────────────────────────────────────────────────────
  const categoryMap: Record<string, Category> = {};
  for (const name of DEFAULT_CATEGORIES) {
    let cat = await categoryRepo.findOneBy({ name, userId: user.id });
    if (!cat) {
      cat = categoryRepo.create({ name, userId: user.id });
      await categoryRepo.save(cat);
    }
    categoryMap[name] = cat;
  }
  console.log(`✅  ${DEFAULT_CATEGORIES.length} categories seeded`);

  // ── 3. Sample transactions ───────────────────────────────────────────────
  const existing = await transactionRepo.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`ℹ️   ${existing} transactions already exist — skipping`);
    await AppDataSource.destroy();
    return;
  }

  const samples: Partial<Transaction>[] = [
    // Income
    { amount: 5000, category: categoryMap['Salary'], date: daysAgo(1), type: TransactionType.INCOME, description: 'Monthly salary' },
    { amount: 800, category: categoryMap['Freelance'], date: daysAgo(5), type: TransactionType.INCOME, description: 'Web project' },
    { amount: 200, category: categoryMap['Investment'], date: daysAgo(10), type: TransactionType.INCOME, description: 'Dividend payout' },
    { amount: 5000, category: categoryMap['Salary'], date: daysAgo(31), type: TransactionType.INCOME, description: 'Monthly salary' },
    { amount: 350, category: categoryMap['Freelance'], date: daysAgo(35), type: TransactionType.INCOME, description: 'Design work' },

    // Expenses
    { amount: randomBetween(50, 120), category: categoryMap['Food & Dining'], date: daysAgo(2), type: TransactionType.EXPENSE, description: 'Grocery run' },
    { amount: randomBetween(20, 60), category: categoryMap['Food & Dining'], date: daysAgo(4), type: TransactionType.EXPENSE, description: 'Restaurant dinner' },
    { amount: randomBetween(30, 80), category: categoryMap['Transport'], date: daysAgo(3), type: TransactionType.EXPENSE, description: 'Fuel' },
    { amount: randomBetween(100, 200), category: categoryMap['Utilities'], date: daysAgo(6), type: TransactionType.EXPENSE, description: 'Electricity bill' },
    { amount: 1200, category: categoryMap['Rent'], date: daysAgo(7), type: TransactionType.EXPENSE, description: 'Monthly rent' },
    { amount: randomBetween(40, 90), category: categoryMap['Entertainment'], date: daysAgo(8), type: TransactionType.EXPENSE, description: 'Cinema + dinner' },
    { amount: randomBetween(60, 150), category: categoryMap['Healthcare'], date: daysAgo(12), type: TransactionType.EXPENSE, description: 'Pharmacy' },
    { amount: randomBetween(100, 300), category: categoryMap['Shopping'], date: daysAgo(14), type: TransactionType.EXPENSE, description: 'Clothing' },
    { amount: randomBetween(80, 200), category: categoryMap['Education'], date: daysAgo(18), type: TransactionType.EXPENSE, description: 'Online course' },
    { amount: randomBetween(200, 500), category: categoryMap['Travel'], date: daysAgo(20), type: TransactionType.EXPENSE, description: 'Weekend trip' },

    // Last month
    { amount: randomBetween(50, 100), category: categoryMap['Food & Dining'], date: daysAgo(33), type: TransactionType.EXPENSE, description: 'Weekly groceries' },
    { amount: randomBetween(30, 70), category: categoryMap['Transport'], date: daysAgo(36), type: TransactionType.EXPENSE, description: 'Uber rides' },
    { amount: 1200, category: categoryMap['Rent'], date: daysAgo(37), type: TransactionType.EXPENSE, description: 'Monthly rent' },
    { amount: randomBetween(60, 100), category: categoryMap['Utilities'], date: daysAgo(38), type: TransactionType.EXPENSE, description: 'Internet + phone' },
    { amount: randomBetween(50, 150), category: categoryMap['Entertainment'], date: daysAgo(40), type: TransactionType.EXPENSE, description: 'Streaming / games' },
  ];

  for (const s of samples) {
    const tx = transactionRepo.create({ ...s, userId: user.id });
    await transactionRepo.save(tx);
  }

  console.log(`✅  ${samples.length} sample transactions seeded`);
  await AppDataSource.destroy();
  console.log('🎉  Seeding complete!');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
