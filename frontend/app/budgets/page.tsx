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
  Divider,
  IconButton,
  Tooltip,
  Paper,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { DatePicker } from '@mui/x-date-pickers';
import { addWeeks, addMonths, addYears, subDays } from 'date-fns';
import { useCategories, useCreateCategory } from '@/app/hooks/useCategories';
import { useBudgets, useCreateBudget, useDeleteBudget, useUpdateBudget, useBudgetStatus } from '@/app/hooks/useBudgets';
import { BudgetPeriod, Budget } from '@/app/types';

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  categoryId: z.string().uuid('Select a category'),
  amount: z.coerce.number().positive('Must be positive'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

// ─── Helper: compute end date from period + start ─────────────────────────────

function computeEndDate(period: BudgetPeriod, startDate: string): string {
  const d = new Date(startDate);
  let end: Date;
  if (period === 'weekly') end = subDays(addWeeks(d, 1), 1);
  else if (period === 'monthly') end = subDays(addMonths(d, 1), 1);
  else end = subDays(addYears(d, 1), 1);
  return end.toISOString().split('T')[0];
}

// ─── Details Dialog ───────────────────────────────────────────────────────────

function BudgetDetailsDialog({ budgetId, open, onClose }: { budgetId: string; open: boolean; onClose: () => void }) {
  const { data: status, isLoading } = useBudgetStatus(budgetId);

  const pct = status ? Math.min(status.percentageUsed, 100) : 0;
  const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Budget Details</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <CircularProgress />
        ) : status ? (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>{status.category?.name}</Typography>
              <Chip label={status.period} />
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Period</Typography>
              <Typography variant="body1">
                {new Date(status.startDate).toLocaleDateString()} – {new Date(status.endDate).toLocaleDateString()}
              </Typography>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Usage</Typography>
                <Typography variant="body2" fontWeight={700} color={`${color}.main`}>{pct.toFixed(1)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 10, borderRadius: 5 }} />
            </Box>

            <Grid container spacing={1}>
              {[
                { label: 'Base Budget', value: status.amount, color: 'primary.main' },
                { label: 'Income Added', value: status.incomeContributions ?? 0, color: 'success.main' },
                { label: 'Effective Budget', value: status.effectiveBudget ?? status.amount, color: 'info.main' },
                { label: 'Spent', value: status.spent, color: 'error.main' },
                { label: 'Remaining', value: status.remaining, color: status.remaining >= 0 ? 'success.main' : 'error.main' },
              ].map(({ label, value, color: c }) => (
                <Grid size={{ xs: 6, sm: 4 }} key={label}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={c}>
                      ${Number(value).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Income contributions breakdown */}
            {(status.incomeItems ?? []).length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1} color="success.main">
                  Income Added to This Budget
                </Typography>
                <Stack spacing={0.5}>
                  {(status.incomeItems ?? []).map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.75,
                        bgcolor: 'success.50',
                        border: '1px solid',
                        borderColor: 'success.200',
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.date).toLocaleDateString()}
                        </Typography>
                        {item.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {item.description}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        +${Number(item.amount).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {pct >= 100 && (
              <Alert severity="error">
                Budget exceeded by ${(Number(status.spent) - Number(status.amount)).toFixed(2)}
              </Alert>
            )}
            {pct >= 80 && pct < 100 && (
              <Alert severity="warning">
                Over 80% used — ${Number(status.remaining).toFixed(2)} remaining
              </Alert>
            )}
            {pct < 80 && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                On track — ${Number(status.remaining).toFixed(2)} remaining
              </Alert>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Budget status card ────────────────────────────────────────────────────────

function BudgetStatusCard({
  budgetId,
  onEdit,
  onDetails,
}: {
  budgetId: string;
  onEdit: (budget: Budget) => void;
  onDetails: (id: string) => void;
}) {
  const { data: status, isLoading } = useBudgetStatus(budgetId);
  const deleteBudget = useDeleteBudget();

  if (isLoading) {
    return <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />;
  }
  if (!status) return null;

  const effectiveBudget = status.effectiveBudget ?? status.amount;
  const pct = effectiveBudget > 0 ? Math.min((Number(status.spent) / effectiveBudget) * 100, 100) : 0;
  const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
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
            ${Number(effectiveBudget).toFixed(2)} budget{(status.incomeContributions ?? 0) > 0 ? ' (+income)' : ''}
          </Typography>
        </Box>

        {(status.incomeContributions ?? 0) > 0 && (
          <Chip
            label={`+$${Number(status.incomeContributions).toFixed(2)} income added`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ mt: 1 }}
          />
        )}

        {pct >= 100 && (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
            Exceeded by ${(Number(status.spent) - Number(effectiveBudget)).toFixed(2)}
          </Alert>
        )}
        {pct >= 80 && pct < 100 && (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
            ${Number(status.remaining).toFixed(2)} remaining
          </Alert>
        )}
      </CardContent>
      <Divider />
      <CardActions sx={{ px: 1.5, py: 1, justifyContent: 'flex-end', gap: 0.5 }}>
        <Tooltip title="Details">
          <IconButton size="small" color="info" onClick={() => onDetails(budgetId)}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => onEdit(status as Budget)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            disabled={deleteBudget.isPending}
            onClick={() => deleteBudget.mutate(budgetId)}
          >
            {deleteBudget.isPending ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

// ─── Budget form dialog (create + edit) ──────────────────────────────────────

function BudgetFormDialog({
  open,
  editBudget,
  onClose,
}: {
  open: boolean;
  editBudget: Budget | null;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  // Inline new-category state
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [catSuccess, setCatSuccess] = useState('');

  const isEdit = Boolean(editBudget);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: editBudget
      ? {
          categoryId: editBudget.categoryId,
          amount: editBudget.amount,
          period: editBudget.period,
          startDate: editBudget.startDate,
          endDate: editBudget.endDate,
        }
      : { period: 'monthly' },
  });

  const watchedPeriod = watch('period');
  const watchedStart = watch('startDate');

  // Auto-compute end date when period or startDate changes
  const handlePeriodOrStartChange = (period: BudgetPeriod, start: string) => {
    if (start) {
      setValue('endDate', computeEndDate(period, start));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory.mutateAsync(newCatName.trim());
    setCatSuccess(`Category "${newCatName.trim()}" created!`);
    setNewCatName('');
    setShowNewCat(false);
    setTimeout(() => setCatSuccess(''), 3000);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, period: values.period as BudgetPeriod };
    if (isEdit && editBudget) {
      await updateBudget.mutateAsync({ id: editBudget.id, data: payload });
    } else {
      await createBudget.mutateAsync(payload);
    }
    reset();
    setShowNewCat(false);
    setCatSuccess('');
    onClose();
  };

  const mutationError = createBudget.error ?? updateBudget.error;

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); setShowNewCat(false); setCatSuccess(''); onClose(); }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{isEdit ? 'Edit Budget' : 'New Budget'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            {mutationError && (
              <Alert severity="error">
                {(mutationError as { message?: string })?.message ?? 'Failed to save budget'}
              </Alert>
            )}

            {/* Category selector + inline create */}
            <Box>
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

              {/* Toggle to show new category input */}
              {!showNewCat ? (
                <Button
                  size="small"
                  sx={{ mt: 0.5 }}
                  onClick={() => setShowNewCat(true)}
                >
                  + Create new category
                </Button>
              ) : (
                <Paper variant="outlined" sx={{ p: 1.5, mt: 1, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    New category name
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="e.g. Groceries"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                      fullWidth
                      InputProps={{
                        endAdornment: createCategory.isPending ? (
                          <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                        ) : undefined,
                      }}
                    />
                    <Button size="small" variant="contained" onClick={handleCreateCategory} disabled={!newCatName.trim() || createCategory.isPending}>
                      Add
                    </Button>
                    <Button size="small" onClick={() => { setShowNewCat(false); setNewCatName(''); }}>
                      Cancel
                    </Button>
                  </Box>
                </Paper>
              )}

              {catSuccess && (
                <Box sx={{ mt: 1, px: 1.5, py: 0.75, bgcolor: 'success.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="success.dark" fontWeight={600}>{catSuccess}</Typography>
                </Box>
              )}
            </Box>

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
                  <Select
                    {...field}
                    label="Period *"
                    onChange={(e) => {
                      field.onChange(e);
                      handlePeriodOrStartChange(e.target.value as BudgetPeriod, watchedStart);
                    }}
                  >
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
                  onChange={(val) => {
                    const iso = val ? val.toISOString().split('T')[0] : '';
                    field.onChange(iso);
                    handlePeriodOrStartChange(watchedPeriod as BudgetPeriod, iso);
                  }}
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
                    textField: {
                      error: Boolean(errors.endDate),
                      helperText: errors.endDate?.message ?? 'Auto-filled based on period & start date',
                    },
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { reset(); setShowNewCat(false); setCatSuccess(''); onClose(); }}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSubmitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create budget')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data: budgets, isLoading, isError } = useBudgets();

  const openCreate = () => { setEditBudget(null); setFormOpen(true); };
  const openEdit = (b: Budget) => { setEditBudget(b); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditBudget(null); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Budgets
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
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
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : budgets && budgets.length > 0 ? (
        <Grid container spacing={2}>
          {budgets.map((b) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
              <BudgetStatusCard
                budgetId={b.id}
                onEdit={openEdit}
                onDetails={(id) => setDetailsId(id)}
              />
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create your first budget
          </Button>
        </Box>
      )}

      <BudgetFormDialog open={formOpen} editBudget={editBudget} onClose={closeForm} />

      {detailsId && (
        <BudgetDetailsDialog
          budgetId={detailsId}
          open={Boolean(detailsId)}
          onClose={() => setDetailsId(null)}
        />
      )}
    </Box>
  );
}
