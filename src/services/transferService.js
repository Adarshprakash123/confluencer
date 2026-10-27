const pool = require('../db/pool');
const AppError = require('../errors/AppError');
const {
  toMoneyNumber,
  serializeAccount,
  serializeTransaction,
} = require('../utils/money');

async function transfer({
  from_account_id,
  to_account_id,
  amount,
  reference_id,
  description,
}) {
  if (from_account_id === to_account_id) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'from_account_id and to_account_id must be different'
    );
  }

  const moneyAmount = toMoneyNumber(amount);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock accounts in stable UUID order to avoid deadlocks
    const [firstId, secondId] =
      from_account_id < to_account_id
        ? [from_account_id, to_account_id]
        : [to_account_id, from_account_id];

    const locked = await client.query(
      `SELECT id, name, balance, created_at
       FROM accounts
       WHERE id IN ($1, $2)
       ORDER BY id
       FOR UPDATE`,
      [firstId, secondId]
    );

    if (locked.rows.length !== 2) {
      const found = new Set(locked.rows.map((r) => r.id));
      const missing = [from_account_id, to_account_id].find((id) => !found.has(id));
      throw new AppError(
        404,
        'ACCOUNT_NOT_FOUND',
        `Account ${missing} was not found`
      );
    }

    const byId = Object.fromEntries(locked.rows.map((r) => [r.id, r]));
    const source = byId[from_account_id];
    const destination = byId[to_account_id];

    const sourceBalance = toMoneyNumber(source.balance);
    if (sourceBalance < moneyAmount) {
      throw new AppError(
        422,
        'INSUFFICIENT_BALANCE',
        `Insufficient balance. Available: ${sourceBalance}, requested: ${moneyAmount}`
      );
    }

    const debitRef = `${reference_id}:debit`;
    const creditRef = `${reference_id}:credit`;
    const note =
      description ??
      `Transfer ${moneyAmount} from ${from_account_id} to ${to_account_id}`;

    let debitTx;
    let creditTx;
    try {
      debitTx = await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, reference_id)
         VALUES ($1, 'debit', $2, $3, $4)
         RETURNING id, account_id, type, amount, description, reference_id, created_at`,
        [from_account_id, moneyAmount, note, debitRef]
      );

      creditTx = await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, reference_id)
         VALUES ($1, 'credit', $2, $3, $4)
         RETURNING id, account_id, type, amount, description, reference_id, created_at`,
        [to_account_id, moneyAmount, note, creditRef]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(
          409,
          'DUPLICATE_TRANSACTION',
          'A transfer with this reference_id already exists for one of the accounts'
        );
      }
      throw err;
    }

    const newSourceBalance = toMoneyNumber(sourceBalance - moneyAmount);
    const newDestBalance = toMoneyNumber(
      toMoneyNumber(destination.balance) + moneyAmount
    );

    await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
      newSourceBalance,
      from_account_id,
    ]);
    await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
      newDestBalance,
      to_account_id,
    ]);

    await client.query('COMMIT');

    return {
      amount: moneyAmount,
      reference_id,
      from_account: serializeAccount({
        ...source,
        balance: newSourceBalance,
      }),
      to_account: serializeAccount({
        ...destination,
        balance: newDestBalance,
      }),
      debit_transaction: serializeTransaction(debitTx.rows[0]),
      credit_transaction: serializeTransaction(creditTx.rows[0]),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  transfer,
};
