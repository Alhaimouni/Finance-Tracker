/**
 * Unit tests for the transaction form Zod schema.
 * These run in isolation — no React or DOM needed.
 */

import { z } from 'zod';

// ─── Copy of the schema from transactions/new/page.tsx ────────────────────────
const schema = z.object({
  amount: z.coerce.number().positive('Must be greater than 0'),
  categoryId: z.string().uuid('Please select a category'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['income', 'expense']),
  description: z.string().max(255).optional(),
});

describe('Transaction form schema', () => {
  const validPayload = {
    amount: 100,
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
    date: '2024-01-15',
    type: 'expense' as const,
    description: 'Groceries',
  };

  it('accepts a valid payload', () => {
    const result = schema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('coerces a string amount to number', () => {
    const result = schema.safeParse({ ...validPayload, amount: '99.99' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(99.99);
  });

  it('rejects amount = 0', () => {
    const result = schema.safeParse({ ...validPayload, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = schema.safeParse({ ...validPayload, amount: -50 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for categoryId', () => {
    const result = schema.safeParse({ ...validPayload, categoryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty date', () => {
    const result = schema.safeParse({ ...validPayload, date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type value', () => {
    const result = schema.safeParse({ ...validPayload, type: 'transfer' });
    expect(result.success).toBe(false);
  });

  it('accepts "income" type', () => {
    const result = schema.safeParse({ ...validPayload, type: 'income' });
    expect(result.success).toBe(true);
  });

  it('rejects description longer than 255 characters', () => {
    const result = schema.safeParse({ ...validPayload, description: 'x'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('allows missing description (optional)', () => {
    const { description: _, ...without } = validPayload;
    const result = schema.safeParse(without);
    expect(result.success).toBe(true);
  });
});
