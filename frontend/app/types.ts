// ─── Core Domain Types ────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO 8601
  type: TransactionType;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionFormData = {
  amount: number;
  categoryId: string;
  date: string;
  type: TransactionType;
  description?: string;
};

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  userId: string;
}

export interface BudgetStatus extends Budget {
  spent: number;
  remaining: number;
  percentageUsed: number;
  incomeContributions: number;
  effectiveBudget: number;
  incomeItems: { id: string; date: string; amount: number; description: string | null }[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

// ─── Filters / Query ─────────────────────────────────────────────────────────

export interface TransactionFilters {
  startDate: Date | null;
  endDate: Date | null;
  searchTerm: string;
  category: string;
  type: TransactionType | 'all';
  page: number;
  limit: number;
  sortBy: keyof Transaction | '';
  sortOrder: 'asc' | 'desc';
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  byCategory: { category: string; total: number; count: number }[];
}
