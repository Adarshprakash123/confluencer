const express = require('express');
const validate = require('../middleware/validate');
const { createAccountBody, uuidParam } = require('../schemas');
const accountService = require('../services/accountService');

const router = express.Router();

router.post('/', validate(createAccountBody), async (req, res, next) => {
  try {
    const account = await accountService.createAccount(req.body);
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate(uuidParam, 'params'), async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(req.params.id);
    res.json(account);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
