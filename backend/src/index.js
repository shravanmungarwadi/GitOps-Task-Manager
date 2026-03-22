// index.js
const express = require('express');
const cors = require('cors');

const config = require('./config');
const { initDB } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();

// ── CORS ────────────────────────────────────────────────────────
// FIX: restrict allowed origins using env variable in production
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);  // also handles /api/tasks/categories internally

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// ── Global Error Handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────
const startServer = async () => {
  await initDB();
  app.listen(config.PORT, () => {
    console.log(`✅ Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    console.log(`   Health: http://localhost:${config.PORT}/health`);
    console.log(`   API:    http://localhost:${config.PORT}/api`);
  });
};

startServer();