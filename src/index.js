const config = require('./config');
const app = require('./app');
const pool = require('./db/pool');

async function start() {
  // Verify DB connectivity before accepting traffic
  await pool.query('SELECT 1');

  app.listen(config.port, () => {
    console.log(`Banking ledger API listening on port ${config.port}`);
    console.log(`API docs: http://localhost:${config.port}/docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
