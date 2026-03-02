'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './NavBar';
import { useCurrentUser } from '@/app/hooks/useAuth';
import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFFFFF' }}>
        <CircularProgress sx={{ color: '#A78F65' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {/* Sidebar: handles both desktop static + mobile drawer internally */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Right side: mobile top bar + content */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile-only top AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            display: { xs: 'flex', md: 'none' },
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            color: '#000000',
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, color: '#000000' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#A78F65' }}>
              Finance
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} sx={{ ml: 0.5 }}>
              Tracker
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Main scrollable content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 2, md: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
