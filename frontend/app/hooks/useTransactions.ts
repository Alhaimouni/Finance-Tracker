'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api';
import { TransactionFilters, TransactionFormData } from '@/app/types';

// Query key factory
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: Partial<TransactionFilters>) => ['transactions', 'list', filters] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
  summary: (start?: string, end?: string) => ['transactions', 'summary', start, end] as const,
};

// ─── List (paginated, filtered, sorted) ─────────────────────────────────────

export function useTransactions(filters: Partial<TransactionFilters> = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => transactionsApi.getAll(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ─── Single transaction ───────────────────────────────────────────────────────

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionsApi.getById(id),
    enabled: Boolean(id),
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function useTransactionSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: transactionKeys.summary(startDate, endDate),
    queryFn: () => transactionsApi.getSummary(startDate, endDate),
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionFormData) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) =>
      transactionsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.setQueryData(transactionKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
