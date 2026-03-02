'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { LoginDto, RegisterDto } from '@/app/types';

export const authKeys = {
  profile: ['auth', 'profile'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: () => authApi.getProfile(),
    retry: false,          // don't retry 401s
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      router.push('/transactions');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (dto: RegisterDto) => authApi.register(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      router.push('/transactions');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/auth/login');
    },
  });
}
