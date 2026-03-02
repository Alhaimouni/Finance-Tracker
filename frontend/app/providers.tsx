'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode, useState } from 'react';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#A78F65',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '2px solid #000000',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            boxShadow: 'none',
            border: '2px solid #000000',
          },
          '&.Mui-disabled': {
            border: '2px solid rgba(0,0,0,0.2)',
          },
        },
        outlined: {
          borderColor: '#000000',
          borderWidth: '2px',
          color: '#000000',
          '&:hover': {
            borderWidth: '2px',
            borderColor: '#000000',
            backgroundColor: 'rgba(0,0,0,0.04)',
          },
        },
        text: {
          color: '#000000',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#000000',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': {
            backgroundColor: '#000000',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#333333',
            },
          },
        },
      },
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
} 