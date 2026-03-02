'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Divider,
  LinearProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useTransactionSummary } from '@/app/hooks/useTransactions';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

// ─── Preset ranges ─────────────────────────────────────────────────────────────

type Preset = 'week' | 'month' | 'year' | 'custom';

function getPresetDates(preset: Preset): { start: Date; end: Date } {
  const now = new Date();
  if (preset === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (preset === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (preset === 'year') return { start: startOfYear(now), end: endOfYear(now) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 2, borderLeft: `4px solid`, borderLeftColor: color }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}20`,
            color,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const { start, end } =
    preset === 'custom' && customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getPresetDates(preset);

  const startIso = format(start, 'yyyy-MM-dd');
  const endIso = format(end, 'yyyy-MM-dd');

  const { data: summary, isLoading, isError, refetch } = useTransactionSummary(startIso, endIso);

  const totalIncome = Number(summary?.totalIncome ?? 0);
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const netBalance = Number(summary?.netBalance ?? 0);

  // Sort by category spending
  const byCat = [...(summary?.byCategory ?? [])].sort((a, b) => b.total - a.total);
  const maxCatTotal = byCat[0]?.total ?? 1;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Statistics & Reports
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* Range selector */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Period:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={preset}
            onChange={(_e, val) => val && setPreset(val)}
          >
            <ToggleButton value="week">This week</ToggleButton>
            <ToggleButton value="month">This month</ToggleButton>
            <ToggleButton value="year">This year</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          {preset === 'custom' && (
            <>
              <DatePicker
                label="From"
                value={customStart}
                onChange={setCustomStart}
                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
              />
              <DatePicker
                label="To"
                value={customEnd}
                onChange={setCustomEnd}
                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
              />
            </>
          )}

          <Chip
            label={`${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`}
            size="small"
            variant="outlined"
          />
        </Stack>
      </Paper>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load statistics.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <Stack spacing={3}>
          {/* KPI cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                title="Total Income"
                value={`$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                icon={<TrendingUpIcon />}
                color="#2e7d32"
                subtitle="All income transactions"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                title="Total Expenses"
                value={`$${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                icon={<TrendingDownIcon />}
                color="#c62828"
                subtitle="All expense transactions"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                title="Net Balance"
                value={`${netBalance >= 0 ? '+' : ''}$${Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                icon={<AccountBalanceWalletIcon />}
                color={netBalance >= 0 ? '#1565c0' : '#b71c1c'}
                subtitle={netBalance >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
              />
            </Grid>
          </Grid>

          {/* Income vs expenses bar */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Income vs Expenses
            </Typography>
            {totalIncome === 0 && totalExpense === 0 ? (
              <Typography variant="body2" color="text.secondary">No transactions in this period.</Typography>
            ) : (
              <Stack spacing={1.5}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Income</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 0}
                    color="success"
                    sx={{ height: 12, borderRadius: 6 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Expenses</Typography>
                    <Typography variant="body2" fontWeight={700} color="error.main">
                      ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 0}
                    color="error"
                    sx={{ height: 12, borderRadius: 6 }}
                  />
                </Box>
              </Stack>
            )}
          </Paper>

          {/* By category breakdown */}
          {byCat.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Spending by Category
              </Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                {byCat.map((row) => (
                  <Box key={row.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {row.category}
                        </Typography>
                        <Chip label={`${row.count} txn${row.count !== 1 ? 's' : ''}`} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        ${Number(row.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(Number(row.total) / maxCatTotal) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Savings rate */}
          {totalIncome > 0 && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Savings Rate
              </Typography>
              {(() => {
                const rate = Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100);
                const rateColor = rate >= 20 ? 'success' : rate >= 10 ? 'warning' : 'error';
                return (
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        You saved {rate.toFixed(1)}% of your income
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={`${rateColor}.main`}>
                        ${Math.max(0, totalIncome - totalExpense).toFixed(2)} saved
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(rate, 100)}
                      color={rateColor}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Stack>
                );
              })()}
            </Paper>
          )}
        </Stack>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No data for the selected period.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
