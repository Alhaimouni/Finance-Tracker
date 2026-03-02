'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/lib/api';
import { Budget } from '@/app/types';

export const budgetKeys = {
  all: ['budgets'] as const,
  status: (id: string) => ['budgets', 'status', id] as const,
};

export function useBudgets() {
  return useQuery({
    queryKey: budgetKeys.all,
    queryFn: () => budgetsApi.getAll(),
  });
}

export function useBudgetStatus(id: string) {
  return useQuery({
    queryKey: budgetKeys.status(id),
    queryFn: () => budgetsApi.getStatus(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Budget, 'id' | 'userId' | 'category'>) =>
      budgetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/budgets/${id}`, { method: 'DELETE', credentials: 'include' }).then((r) => {
        if (!r.ok) throw new Error('Failed to delete budget');
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
