const pool = require('../db/pool');
const AppError = require('../errors/AppError');
const { serializeAccount } = require('../utils/money');

async function createAccount({ name }) {
  const { rows } = await pool.query(
    `INSERT INTO accounts (name)
     VALUES ($1)
     RETURNING id, name, balance, created_at`,
    [name]
  );
  return serializeAccount(rows[0]);
}

async function getAccountById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, balance, created_at
     FROM accounts
     WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', `Account ${id} was not found`);
  }
  return serializeAccount(rows[0]);
}

module.exports = {
  createAccount,
  getAccountById,
};
