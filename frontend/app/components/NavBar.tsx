'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Skeleton,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCurrentUser, useLogout } from '@/app/hooks/useAuth';

const NAV_LINKS = [
  { label: 'Transactions', href: '/transactions' },
  { label: 'Budgets', href: '/budgets' },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleMenuClose();
    logout.mutate();
  };

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, mr: 4 }}>
          Finance Tracker
        </Typography>

        {/* Nav links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Button
              key={href}
              color="inherit"
              component={Link}
              href={href}
              sx={{
                fontWeight: pathname.startsWith(href) ? 700 : 400,
                borderBottom: pathname.startsWith(href) ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        {/* New Transaction CTA */}
        <Button
          variant="outlined"
          color="inherit"
          component={Link}
          href="/transactions/new"
          sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.6)' }}
        >
          + New Transaction
        </Button>

        {/* User menu */}
        {isLoading ? (
          <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
        ) : user ? (
          <>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14 }}>
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>Sign out</MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" component={Link} href="/auth/login">
            Sign in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
