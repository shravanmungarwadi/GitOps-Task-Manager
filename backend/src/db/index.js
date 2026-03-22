// ============================================================
// db/index.js
// Sets up the connection pool to PostgreSQL.
// A "pool" means we keep multiple connections open
// so we don't reconnect to the DB on every request.
// Also creates tables if they don't exist yet.
// ============================================================

const { Pool } = require('pg');
const config = require('../config');

// Create the connection pool using our config values
const pool = new Pool(config.DB);

// ── SQL to create our tables ──────────────────────────────────

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100)        NOT NULL,
    email      VARCHAR(150) UNIQUE NOT NULL,
    password   VARCHAR(255)        NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    color      VARCHAR(20)  DEFAULT '#6366f1',
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    completed   BOOLEAN      DEFAULT FALSE,
    priority    VARCHAR(20)  DEFAULT 'medium',  -- low / medium / high
    due_date    DATE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
  );
`;

// ── Connect and initialize tables ─────────────────────────────

const initDB = async () => {
  try {
    // Test the connection first
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');

    // Create tables in order (users first, then categories, then tasks)
    await pool.query(CREATE_USERS_TABLE);
    await pool.query(CREATE_CATEGORIES_TABLE);
    await pool.query(CREATE_TASKS_TABLE);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    // Exit process so Kubernetes knows the pod is unhealthy
    process.exit(1);
  }
};

module.exports = { pool, initDB };