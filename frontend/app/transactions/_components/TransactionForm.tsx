'use client';

import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Autocomplete,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCategories, useCreateCategory } from '@/app/hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction, useTransaction } from '@/app/hooks/useTransactions';
import { TransactionFormData } from '@/app/types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  amount: z.coerce.number().positive('Must be greater than 0'),
  categoryId: z.string().uuid('Please select a category'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['income', 'expense']),
  description: z.string().max(255).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionFormProps {
  editId?: string; // when present, renders in edit mode
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionForm({ editId }: TransactionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(editId);

  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: existing } = useTransaction(editId ?? '');
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const createCategory = useCreateCategory();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { type: 'expense', date: new Date().toISOString().split('T')[0] },
  });

  // Pre-fill when editing
  useEffect(() => {
    if (existing) {
      reset({
        amount: Number(existing.amount),
        categoryId: existing.category?.id ?? '',
        date: existing.date,
        type: existing.type,
        description: existing.description ?? '',
      });
    }
  }, [existing, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: TransactionFormData = {
        amount: values.amount,
        categoryId: values.categoryId,
        date: values.date,
        type: values.type,
        description: values.description,
      };

      if (isEdit && editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      router.push('/transactions');
    } catch {
      // error shown in Alert below
    }
  };

  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button component={Link} href="/transactions" startIcon={<ArrowBackIcon />} size="small">
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ ml: 1 }}>
          {isEdit ? 'Edit Transaction' : 'New Transaction'}
        </Typography>
      </Box>

      {mutationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(mutationError as { message?: string })?.message ?? 'Something went wrong. Please try again.'}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3} maxWidth={520}>
          {/* Type toggle */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Transaction type *
            </Typography>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value}
                  onChange={(_e, val) => val && field.onChange(val)}
                  fullWidth
                >
                  <ToggleButton value="income" color="success">
                    Income
                  </ToggleButton>
                  <ToggleButton value="expense" color="error">
                    Expense
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
            {errors.type && (
              <Typography variant="caption" color="error">
                {errors.type.message}
              </Typography>
            )}
          </Box>

          {/* Amount */}
          <TextField
            label="Amount *"
            type="number"
            inputProps={{ min: 0.01, step: 0.01 }}
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            {...register('amount')}
          />

          {/* Category */}
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                loading={loadingCategories}
                options={categories ?? []}
                getOptionLabel={(opt) => opt.name}
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
                noOptionsText={
                  <Button
                    size="small"
                    onClick={async () => {
                      const name = prompt('New category name:');
                      if (!name?.trim()) return;
                      const cat = await createCategory.mutateAsync(name.trim());
                      field.onChange(cat.id);
                    }}
                  >
                    + Create new category
                  </Button>
                }
              />
            )}
          />

          {/* Date */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date *"
                value={field.value ? new Date(field.value) : null}
                onChange={(val) =>
                  field.onChange(val ? val.toISOString().split('T')[0] : '')
                }
                slotProps={{
                  textField: {
                    error: Boolean(errors.date),
                    helperText: errors.date?.message,
                  },
                }}
              />
            )}
          />

          {/* Description */}
          <TextField
            label="Description"
            multiline
            rows={2}
            error={Boolean(errors.description)}
            helperText={errors.description?.message}
            {...register('description')}
          />

          {/* Submit */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isSubmitting
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Save changes'
                : 'Create transaction'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
