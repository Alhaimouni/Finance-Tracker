'use client';

import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  Chip,
  Button,
  Stack,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTransaction } from '@/app/hooks/useTransactions';
import { useDeleteTransaction } from '@/app/hooks/useTransactions';

interface Props {
  transactionId: string | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.25 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} textAlign="right">
        {value}
      </Typography>
    </Box>
  );
}

export default function TransactionDetailDrawer({ transactionId, onClose }: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: transaction, isLoading, isError } = useTransaction(transactionId ?? '');
  const deleteMutation = useDeleteTransaction();

  const handleDelete = async () => {
    if (!transactionId) return;
    await deleteMutation.mutateAsync(transactionId);
    setConfirmDelete(false);
    onClose();
  };

  const handleEdit = () => {
    if (!transactionId) return;
    router.push(`/transactions/${transactionId}/edit`);
    onClose();
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={Boolean(transactionId)}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 0 } }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Transaction Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Body */}
        <Box sx={{ px: 3, py: 2, overflowY: 'auto', flexGrow: 1 }}>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load transaction.
            </Alert>
          )}

          {isLoading ? (
            <Stack spacing={1.5}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={28} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : transaction ? (
            <>
              {/* Amount hero */}
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                >
                  {transaction.type === 'income' ? '+' : '-'}$
                  {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
                <Chip
                  label={transaction.type}
                  size="small"
                  color={transaction.type === 'income' ? 'success' : 'error'}
                  sx={{ mt: 1, textTransform: 'capitalize', fontWeight: 600 }}
                />
              </Box>

              <Divider sx={{ mb: 1 }} />

              <DetailRow
                label="Date"
                value={new Date(transaction.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
              <Divider />
              <DetailRow label="Category" value={transaction.category?.name ?? '—'} />
              <Divider />
              <DetailRow
                label="Description"
                value={transaction.description ?? <em style={{ opacity: 0.5 }}>No description</em>}
              />
              <Divider />
              <DetailRow
                label="Created"
                value={new Date(transaction.createdAt).toLocaleString()}
              />
              <Divider />
              <DetailRow
                label="Last updated"
                value={new Date(transaction.updatedAt).toLocaleString()}
              />
            </>
          ) : null}
        </Box>

        {/* Footer actions */}
        {transaction && (
          <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{ flex: 1 }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
              sx={{ flex: 1 }}
            >
              Delete
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete transaction?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be undone. The transaction will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
