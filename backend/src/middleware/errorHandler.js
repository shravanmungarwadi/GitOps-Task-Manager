// ============================================================
// middleware/errorHandler.js
// Global error handler — catches ANY error thrown anywhere
// in the app and returns a clean JSON response.
// Without this, Express would return ugly HTML error pages.
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Log full error in server console for debugging
  console.error(`[ERROR] ${req.method} ${req.url} →`, err.message);

  // If status code was set on the error, use it; otherwise default to 500
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only show stack trace in development mode (never in production!)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;