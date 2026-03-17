// config/index.js
require('dotenv').config();

// SECURITY: In production, JWT_SECRET MUST be set.
// If someone forgot to set it, crash immediately instead of running with a weak secret.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set in production!');
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DB: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,  // BUG FIX: pg expects a number, not string
    database: process.env.DB_NAME     || 'taskmanager',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  JWT_SECRET:     process.env.JWT_SECRET     || 'changeme_in_development_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS: in production set this to your actual frontend domain
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};