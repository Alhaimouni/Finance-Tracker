'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Alert,
  Chip,
  Autocomplete,
  Stack,
} from '@mui/material';
import { DataGrid, GridColDef, GridSortModel, GridPaginationModel, GridRowParams } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import SearchIcon from '@mui/icons-material/Search';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { useTransactions } from '@/app/hooks/useTransactions';
import { useCategories } from '@/app/hooks/useCategories';
import { useTransactionStore } from '@/app/hooks/useTransactionStore';
import { Transaction } from '@/app/types';
import TransactionDetailDrawer from '@/app/components/TransactionDetailDrawer';

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: GridColDef<Transaction>[] = [
  {
    field: 'date',
    headerName: 'Date',
    width: 120,
    sortable: true,
    valueFormatter: (value: string) =>
      value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  },
  {
    field: 'type',
    headerName: 'Type',
    width: 110,
    sortable: true,
    renderCell: ({ value }) => (
      <Chip
        label={value}
        size="small"
        color={value === 'income' ? 'success' : 'error'}
        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
      />
    ),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 150,
    sortable: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row, value }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <Typography
          variant="body2"
          fontWeight={600}
          color={row.type === 'income' ? 'success.main' : 'error.main'}
        >
          {row.type === 'income' ? '+' : '-'}JOD {Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 160,
    sortable: false,
    valueGetter: (_value: unknown, row: Transaction) => row.category?.name ?? '—',
  },
  {
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 180,
    sortable: false,
    valueFormatter: (value: string | null) => value ?? '—',
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 140,
    sortable: true,
    valueFormatter: (value: string) =>
      value ? new Date(value).toLocaleDateString() : '—',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { filters, setFilter, setDateRange, setPage, resetFilters } = useTransactionStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useTransactions(filters);
  const { data: categories } = useCategories();

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  // ─── DataGrid handlers ─────────────────────────────────────────────────────

  const handlePaginationChange = useCallback(
    (model: GridPaginationModel) => {
      setFilter('page', model.page + 1); // DataGrid is 0-indexed
      setFilter('limit', model.pageSize);
    },
    [setFilter],
  );

  const handleSortChange = useCallback(
    (model: GridSortModel) => {
      if (model.length > 0) {
        setFilter('sortBy', model[0].field as typeof filters.sortBy);
        setFilter('sortOrder', model[0].sort as 'asc' | 'desc');
      } else {
        setFilter('sortBy', '');
      }
    },
    [setFilter],
  );

  const handleRowClick = useCallback((params: GridRowParams<Transaction>) => {
    setSelectedId(params.row.id);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Transactions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<FilterListOffIcon />}
            onClick={resetFilters}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Reset filters
          </Button>
          <Button
            component={Link}
            href="/transactions/new"
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New Transaction</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>New</Box>
          </Button>
        </Box>
      </Box>

      {/* ─── Filter bar ─────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search description or category…"
          value={filters.searchTerm}
          onChange={(e) => setFilter('searchTerm', e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Autocomplete
          size="small"
          options={categories ?? []}
          getOptionLabel={(opt) => opt.name}
          value={categories?.find((c) => c.id === filters.category) ?? null}
          onChange={(_e, val) => setFilter('category', val?.id ?? '')}
          renderInput={(params) => <TextField {...params} placeholder="All categories" />}
          sx={{ minWidth: 180 }}
        />

        <ToggleButtonGroup
          size="small"
          value={filters.type}
          exclusive
          onChange={(_e, val) => val && setFilter('type', val)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="income">Income</ToggleButton>
          <ToggleButton value="expense">Expense</ToggleButton>
        </ToggleButtonGroup>

        <DatePicker
          label="From"
          value={filters.startDate}
          onChange={(val) => setDateRange(val, filters.endDate)}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <DatePicker
          label="To"
          value={filters.endDate}
          onChange={(val) => setDateRange(filters.startDate, val)}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
      </Stack>

      {/* ─── Error ──────────────────────────────────────────────────────── */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as { message?: string })?.message ?? 'Failed to load transactions.'}
        </Alert>
      )}

      {/* ─── DataGrid ───────────────────────────────────────────────────── */}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        rowCount={total}
        loading={isLoading}
        paginationMode="server"
        sortingMode="server"
        paginationModel={{ page: filters.page - 1, pageSize: filters.limit }}
        onPaginationModelChange={handlePaginationChange}
        sortModel={
          filters.sortBy
            ? [{ field: filters.sortBy as string, sort: filters.sortOrder }]
            : []
        }
        onSortModelChange={handleSortChange}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={handleRowClick}
        autoHeight
        disableRowSelectionOnClick
        sx={{
          border: 0,
          '& .MuiDataGrid-row': { cursor: 'pointer' },
          '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50', fontWeight: 700 },
        }}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, py: 8 }}>
              <Typography variant="h6" color="text.secondary">No transactions found</Typography>
              <Typography variant="body2" color="text.disabled">Try adjusting your filters or create a new transaction.</Typography>
            </Box>
          ),
        }}
      />
      </Box>

      {/* ─── Detail Drawer ──────────────────────────────────────────────── */}
      <TransactionDetailDrawer
        transactionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Box>
  );
}
