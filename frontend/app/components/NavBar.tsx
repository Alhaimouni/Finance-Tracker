'use client';

import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Skeleton,
  Tooltip,
  Button,
  Drawer,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/app/hooks/useAuth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';

// ─── Sidebar constants ────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 260;
const SIDEBAR_BG = '#FFFFFF';
const ACTIVE_BG = '#A78F65';
const ACTIVE_TEXT = '#ffffff';
const INACTIVE_TEXT = 'rgba(0,0,0,0.55)';
const HOVER_BG = 'rgba(167,143,101,0.12)';

const NAV_LINKS = [
  { label: 'Transactions', href: '/transactions', icon: <ReceiptLongIcon fontSize="small" /> },
  { label: 'Budgets', href: '/budgets', icon: <AccountBalanceWalletIcon fontSize="small" /> },
  { label: 'Statistics', href: '/statistics', icon: <BarChartIcon fontSize="small" /> },
];

// ─── Inner content (shared by both desktop static + mobile drawer) ────────────

export function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minHeight: '100vh',
        bgcolor: SIDEBAR_BG,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── App title ─────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, pt: 3.5, pb: 2.5 }}>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ color: ACTIVE_BG, letterSpacing: '0.02em', lineHeight: 1.2 }}
        >
          Finance
        </Typography>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ color: '#000000', letterSpacing: '0.02em', lineHeight: 1.2 }}
        >
          Tracker
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(0,0,0,0.1)', mx: 2 }} />

      {/* ── Nav links ─────────────────────────────────────────────────── */}
      <List sx={{ px: 1.5, pt: 1.5, flexGrow: 1 }} disablePadding>
        {NAV_LINKS.map(({ label, href, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              onClick={onClose}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                bgcolor: active ? ACTIVE_BG : 'transparent',
                color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                '&:hover': {
                  bgcolor: active ? ACTIVE_BG : HOVER_BG,
                  color: active ? ACTIVE_TEXT : '#333333',
                },
                '& .MuiListItemIcon-root': {
                  color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                  minWidth: 36,
                },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{
                  primary: { fontSize: 14, fontWeight: active ? 700 : 500 },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* ── User section ──────────────────────────────────────────────── */}
      <Divider sx={{ borderColor: 'rgba(0,0,0,0.1)', mx: 2 }} />
      <Box sx={{ p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Skeleton width={100} height={18} />
          </Box>
        ) : user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: ACTIVE_BG, fontSize: 14, fontWeight: 700 }}>
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} color="#000000" noWrap>
                {user.name}
              </Typography>
              <Typography variant="caption" color={INACTIVE_TEXT} noWrap>
                {user.email}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <Box
                component="button"
                onClick={() => logout.mutate()}
                sx={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: INACTIVE_TEXT,
                  p: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': { color: '#000000' },
                }}
              >
                <LogoutIcon fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Button
            component={Link}
            href="/auth/login"
            fullWidth
            sx={{ color: INACTIVE_TEXT, textTransform: 'none', '&:hover': { color: '#000000' } }}
          >
            Sign in
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ─── Desktop static sidebar ───────────────────────────────────────────────────

export default function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      {/* Mobile: slide-in Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0,0,0,0.08)',
          },
        }}
      >
        <SidebarContent onClose={onMobileClose} />
      </Drawer>

      {/* Desktop: always-visible static panel */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <SidebarContent />
      </Box>
    </>
  );
}
