function toMoneyNumber(value) {
  return Number(Number(value).toFixed(2));
}

function serializeAccount(row) {
  return {
    id: row.id,
    name: row.name,
    balance: toMoneyNumber(row.balance),
    created_at: row.created_at,
  };
}

function serializeTransaction(row) {
  return {
    id: row.id,
    account_id: row.account_id,
    type: row.type,
    amount: toMoneyNumber(row.amount),
    description: row.description,
    reference_id: row.reference_id,
    created_at: row.created_at,
  };
}

module.exports = {
  toMoneyNumber,
  serializeAccount,
  serializeTransaction,
};
