const express = require('express');
const validate = require('../middleware/validate');
const {
  uuidParam,
  createTransactionBody,
  paginationQuery,
} = require('../schemas');
const transactionService = require('../services/transactionService');

const router = express.Router({ mergeParams: true });

router.post(
  '/',
  validate(uuidParam, 'params'),
  validate(createTransactionBody),
  async (req, res, next) => {
    try {
      const result = await transactionService.createTransaction(
        req.params.id,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/',
  validate(uuidParam, 'params'),
  validate(paginationQuery, 'query'),
  async (req, res, next) => {
    try {
      const result = await transactionService.listTransactions(
        req.params.id,
        req.query
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
