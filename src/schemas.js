const { z } = require('zod');

const uuidParam = z.object({
  id: z.uuid('Account ID must be a valid UUID'),
});

const createAccountBody = z.object({
  name: z
    .string({ error: 'Account name must be provided' })
    .trim()
    .min(1, 'Account name must be provided'),
});

const createTransactionBody = z.object({
  type: z.enum(['credit', 'debit'], {
    error: 'Transaction type must be either credit or debit',
  }),
  amount: z.coerce
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .refine((n) => Number.isFinite(n), 'Amount must be a finite number'),
  description: z.string().trim().optional(),
  reference_id: z
    .string({ error: 'reference_id must be provided' })
    .trim()
    .min(1, 'reference_id must be provided'),
});

const paginationQuery = z.object({
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int('page must be an integer')
    .min(1, 'page must be greater than or equal to 1')
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
});

const transferBody = z.object({
  from_account_id: z.uuid('from_account_id must be a valid UUID'),
  to_account_id: z.uuid('to_account_id must be a valid UUID'),
  amount: z.coerce
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  reference_id: z
    .string({ error: 'reference_id must be provided' })
    .trim()
    .min(1, 'reference_id must be provided'),
  description: z.string().trim().optional(),
});

module.exports = {
  uuidParam,
  createAccountBody,
  createTransactionBody,
  paginationQuery,
  transferBody,
};
