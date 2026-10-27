const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl:
    config.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});

module.exports = pool;
