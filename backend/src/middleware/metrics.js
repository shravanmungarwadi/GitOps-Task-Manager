// ============================================================
// metrics.js — Prometheus metrics collection middleware
// Tracks HTTP request count, response time, and active requests
// Also collects Node.js runtime metrics (CPU, memory, event loop)
// Prometheus scrapes the /metrics endpoint to read this data
// ============================================================

const client = require('prom-client');

const register = client.register;

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') return next();

  httpActiveRequests.inc();
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    httpActiveRequests.dec();

    const endTime = process.hrtime.bigint();
    const durationInSeconds = Number(endTime - startTime) / 1e9;

    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      },
      durationInSeconds
    );
  });

  next();
};

module.exports = { metricsMiddleware, register };