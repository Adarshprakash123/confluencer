require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and set it.');
}

module.exports = config;
