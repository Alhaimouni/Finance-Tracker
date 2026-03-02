/**
 * Rendering smoke tests for NavBar.
 * Uses the msw-free approach – we mock React Query and Next.js navigation hooks.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock Next.js hooks ────────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
  useRouter: () => ({ push: jest.fn() }),
}));

// ── Mock React Query hooks ────────────────────────────────────────────────────
jest.mock('@/app/hooks/useAuth', () => ({
  useCurrentUser: jest.fn(),
  useLogout: jest.fn(() => ({ mutate: jest.fn() })),
}));

import { useCurrentUser } from '@/app/hooks/useAuth';
import NavBar from '@/app/components/NavBar';

// ── Minimal MUI provider wrapper ──────────────────────────────────────────────
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// ─────────────────────────────────────────────────────────────────────────────

describe('NavBar', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the app name', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ data: null, isLoading: false });

    render(<NavBar />, { wrapper: Wrapper });

    expect(screen.getByText(/finance tracker/i)).toBeInTheDocument();
  });

  it('shows navigation links', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ data: null, isLoading: false });

    render(<NavBar />, { wrapper: Wrapper });

    expect(screen.getByText(/transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/budgets/i)).toBeInTheDocument();
  });

  it('shows Sign in link when the user is not authenticated', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ data: null, isLoading: false });

    render(<NavBar />, { wrapper: Wrapper });

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('shows the user avatar when authenticated', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      data: { id: '1', email: 'alice@example.com', name: 'Alice' },
      isLoading: false,
    });

    render(<NavBar />, { wrapper: Wrapper });

    // Avatar shows first letter of name
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows a New Transaction button when authenticated', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      data: { id: '1', email: 'alice@example.com', name: 'Alice' },
      isLoading: false,
    });

    render(<NavBar />, { wrapper: Wrapper });

    expect(screen.getByText(/new transaction/i)).toBeInTheDocument();
  });
});
