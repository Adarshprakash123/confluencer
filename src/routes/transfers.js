const express = require('express');
const validate = require('../middleware/validate');
const { transferBody } = require('../schemas');
const transferService = require('../services/transferService');

const router = express.Router();

router.post('/', validate(transferBody), async (req, res, next) => {
  try {
    const result = await transferService.transfer(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
