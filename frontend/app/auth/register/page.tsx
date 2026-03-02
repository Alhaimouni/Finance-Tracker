'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';
import { useRegister } from '@/app/hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const register_ = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => register_.mutate(values);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={800} textAlign="center" mb={0.5}>
            Finance Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Create your account
          </Typography>

          {register_.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(register_.error as { message?: string })?.message ?? 'Registration failed. Try a different email.'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Full name"
                autoComplete="name"
                autoFocus
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                {...register('name')}
              />
              <TextField
                label="Email address"
                type="email"
                autoComplete="email"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting || register_.isPending}
                startIcon={register_.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {register_.isPending ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'inherit', fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
