/**
 * index.js
 *
 * Express application entry point.
 * Initialises middleware, routes, Prometheus metrics collection,
 * and starts the HTTP server after the database is ready.
 */

const express = require('express');
const cors    = require('cors');
const client  = require('prom-client');

const config      = require('./config');
const { initDB }  = require('./db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes  = require('./routes/auth');
const taskRoutes  = require('./routes/tasks');

const app      = express();
const register = client.register;

client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route  = req.route ? req.route.path : req.path;
    const labels = {
      method:      req.method,
      route,
      status_code: res.statusCode,
    };
    httpRequestCounter.inc(labels);
    end(labels);
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status:      'healthy',
    environment: config.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

app.use(errorHandler);

const startServer = async () => {
  await initDB();
  app.listen(config.PORT, () => {
    console.log(`✅ Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    console.log(`   Health:  http://localhost:${config.PORT}/health`);
    console.log(`   Metrics: http://localhost:${config.PORT}/metrics`);
    console.log(`   API:     http://localhost:${config.PORT}/api`);
  });
};

startServer();