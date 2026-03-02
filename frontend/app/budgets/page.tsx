'use client';

import { useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Skeleton,
  Stack,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers';
import { useCategories } from '@/app/hooks/useCategories';
import { useBudgets, useCreateBudget, useDeleteBudget, useBudgetStatus } from '@/app/hooks/useBudgets';
import { BudgetPeriod } from '@/app/types';

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  categoryId: z.string().uuid('Select a category'),
  amount: z.coerce.number().positive('Must be positive'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

// ─── Budget status card ────────────────────────────────────────────────────────

function BudgetStatusCard({ budgetId, onDelete }: { budgetId: string; onDelete: () => void }) {
  const { data: status, isLoading } = useBudgetStatus(budgetId);
  const deleteBudget = useDeleteBudget();

  if (isLoading) {
    return <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />;
  }
  if (!status) return null;

  const pct = Math.min(status.percentageUsed, 100);
  const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {status.category?.name ?? '—'}
          </Typography>
          <Chip label={status.period} size="small" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {new Date(status.startDate).toLocaleDateString()} –{' '}
          {new Date(status.endDate).toLocaleDateString()}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={pct}
          color={color}
          sx={{ height: 8, borderRadius: 4, mb: 1 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            ${Number(status.spent).toFixed(2)} spent
          </Typography>
          <Typography variant="caption" color={`${color}.main`} fontWeight={700}>
            {pct.toFixed(0)}% used
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ${Number(status.amount).toFixed(2)} budget
          </Typography>
        </Box>

        {pct >= 100 && (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
            Budget exceeded by ${(Number(status.spent) - Number(status.amount)).toFixed(2)}
          </Alert>
        )}
        {pct >= 80 && pct < 100 && (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
            Over 80% used — ${Number(status.remaining).toFixed(2)} remaining
          </Alert>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5 }}>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={deleteBudget.isPending}
          onClick={() => deleteBudget.mutate(budgetId, { onSuccess: onDelete })}
        >
          Remove
        </Button>
      </CardActions>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const [open, setOpen] = useState(false);
  const { data: budgets, isLoading, isError } = useBudgets();
  const { data: categories } = useCategories();
  const createBudget = useCreateBudget();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues: { period: 'monthly' } });

  const onSubmit = async (values: FormValues) => {
    await createBudget.mutateAsync({ ...values, period: values.period as BudgetPeriod });
    reset();
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Budgets
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          New Budget
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load budgets.
        </Alert>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[...Array(3)].map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : budgets && budgets.length > 0 ? (
        <Grid container spacing={2}>
          {budgets.map((b) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
              <BudgetStatusCard budgetId={b.id} onDelete={() => {}} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h6" color="text.secondary">
            No budgets yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Create a budget to track spending per category
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create your first budget
          </Button>
        </Box>
      )}

      {/* Create budget dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Budget</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2.5}>
              {createBudget.isError && (
                <Alert severity="error">
                  {(createBudget.error as { message?: string })?.message ?? 'Failed to create budget'}
                </Alert>
              )}

              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={categories ?? []}
                    getOptionLabel={(o) => o.name}
                    value={categories?.find((c) => c.id === field.value) ?? null}
                    onChange={(_e, val) => field.onChange(val?.id ?? '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category *"
                        error={Boolean(errors.categoryId)}
                        helperText={errors.categoryId?.message}
                      />
                    )}
                  />
                )}
              />

              <TextField
                label="Budget amount *"
                type="number"
                inputProps={{ min: 0.01, step: 0.01 }}
                error={Boolean(errors.amount)}
                helperText={errors.amount?.message}
                {...register('amount')}
              />

              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <InputLabel>Period *</InputLabel>
                    <Select {...field} label="Period *">
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Start date *"
                    value={field.value ? new Date(field.value) : null}
                    onChange={(val) => field.onChange(val ? val.toISOString().split('T')[0] : '')}
                    slotProps={{
                      textField: { error: Boolean(errors.startDate), helperText: errors.startDate?.message },
                    }}
                  />
                )}
              />

              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="End date *"
                    value={field.value ? new Date(field.value) : null}
                    onChange={(val) => field.onChange(val ? val.toISOString().split('T')[0] : '')}
                    slotProps={{
                      textField: { error: Boolean(errors.endDate), helperText: errors.endDate?.message },
                    }}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Creating…' : 'Create budget'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
