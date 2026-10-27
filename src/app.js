const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const errorHandler = require('./middleware/errorHandler');
const accountsRouter = require('./routes/accounts');
const transactionsRouter = require('./routes/transactions');
const transfersRouter = require('./routes/transfers');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const openapiPath = path.join(__dirname, '../openapi.yaml');
const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get('/openapi.yaml', (req, res) => {
  res.sendFile(openapiPath);
});

app.use('/accounts', accountsRouter);
app.use('/accounts/:id/transactions', transactionsRouter);
app.use('/transfers', transfersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

app.use(errorHandler);

module.exports = app;
