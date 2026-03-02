'use client';

import { create } from 'zustand';
import { TransactionFilters } from '@/app/types';

const initialFilters: TransactionFilters = {
  startDate: null,
  endDate: null,
  searchTerm: '',
  category: '',
  type: 'all',
  page: 1,
  limit: 10,
  sortBy: '',
  sortOrder: 'desc',
};

interface TransactionState {
  filters: TransactionFilters;
  setFilter: <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => void;
  setDateRange: (startDate: Date | null, endDate: Date | null) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  filters: initialFilters,

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: key !== 'page' ? 1 : (value as number) },
    })),

  setDateRange: (startDate, endDate) =>
    set((state) => ({
      filters: { ...state.filters, startDate, endDate, page: 1 },
    })),

  setPage: (page) =>
    set((state) => ({
      filters: { ...state.filters, page },
    })),

  resetFilters: () => set({ filters: initialFilters }),
}));
