const pool = require('../db/pool');
const AppError = require('../errors/AppError');
const {
  toMoneyNumber,
  serializeTransaction,
} = require('../utils/money');

async function createTransaction(accountId, payload) {
  const { type, amount, description, reference_id } = payload;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
      `SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      throw new AppError(
        404,
        'ACCOUNT_NOT_FOUND',
        `Account ${accountId} was not found`
      );
    }

    const currentBalance = toMoneyNumber(accountResult.rows[0].balance);
    const moneyAmount = toMoneyNumber(amount);

    if (type === 'debit' && currentBalance < moneyAmount) {
      throw new AppError(
        422,
        'INSUFFICIENT_BALANCE',
        `Insufficient balance. Available: ${currentBalance}, requested: ${moneyAmount}`
      );
    }

    const newBalance =
      type === 'credit'
        ? toMoneyNumber(currentBalance + moneyAmount)
        : toMoneyNumber(currentBalance - moneyAmount);

    let txResult;
    try {
      txResult = await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, account_id, type, amount, description, reference_id, created_at`,
        [accountId, type, moneyAmount, description ?? null, reference_id]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(
          409,
          'DUPLICATE_TRANSACTION',
          'A transaction with this reference_id already exists for this account'
        );
      }
      throw err;
    }

    await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
      newBalance,
      accountId,
    ]);

    await client.query('COMMIT');

    return {
      transaction: serializeTransaction(txResult.rows[0]),
      balance: newBalance,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listTransactions(accountId, { page, limit }) {
  const client = await pool.connect();
  try {
    const accountResult = await client.query(
      `SELECT id FROM accounts WHERE id = $1`,
      [accountId]
    );
    if (accountResult.rows.length === 0) {
      throw new AppError(
        404,
        'ACCOUNT_NOT_FOUND',
        `Account ${accountId} was not found`
      );
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM transactions WHERE account_id = $1`,
      [accountId]
    );
    const totalRecords = countResult.rows[0].total;
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    const { rows } = await client.query(
      `SELECT id, account_id, type, amount, description, reference_id, created_at
       FROM transactions
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    return {
      data: rows.map(serializeTransaction),
      pagination: {
        page,
        limit,
        total_records: totalRecords,
        total_pages: totalPages,
      },
    };
  } finally {
    client.release();
  }
}

module.exports = {
  createTransaction,
  listTransactions,
};
