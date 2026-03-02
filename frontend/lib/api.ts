import {
  Transaction,
  TransactionFormData,
  TransactionFilters,
  PaginatedResponse,
  Category,
  Budget,
  BudgetStatus,
  TransactionSummary,
  AuthTokens,
  LoginDto,
  RegisterDto,
} from '@/app/types';

// Base URL for Next.js API proxy routes (always relative so it works server + client side)
const API_BASE = '/api';

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // send httpOnly auth cookie
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw { statusCode: res.status, ...error };
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function buildTransactionQuery(filters: Partial<TransactionFilters>): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
  if (filters.searchTerm) params.set('search', filters.searchTerm);
  if (filters.category) params.set('category', filters.category);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const transactionsApi = {
  getAll: (filters: Partial<TransactionFilters> = {}) =>
    request<PaginatedResponse<Transaction>>(`/transactions${buildTransactionQuery(filters)}`),

  getById: (id: string) =>
    request<Transaction>(`/transactions/${id}`),

  create: (data: TransactionFormData) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<TransactionFormData>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/transactions/${id}`, { method: 'DELETE' }),

  getSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return request<TransactionSummary>(`/transactions/summary${qs ? `?${qs}` : ''}`);
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: () => request<Category[]>('/categories'),

  create: (name: string) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const budgetsApi = {
  getAll: () => request<Budget[]>('/budgets'),

  create: (data: Omit<Budget, 'id' | 'userId' | 'category'>) =>
    request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStatus: (id: string) =>
    request<BudgetStatus>(`/budgets/${id}/status`),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (dto: LoginDto) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  register: (dto: RegisterDto) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  getProfile: () =>
    request<AuthTokens['user']>('/auth/profile'),
};
