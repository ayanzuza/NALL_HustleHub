/**
 * Centralised Error Handling
 * notFound() catches unmatched routes with a consistent 404 shape.
 * errorHandler() logs the full error server-side (stack trace in
 * development only) and returns a safe, generic JSON message to
 * the client -- never a stack trace, file path, or config value.
 */

const { nodeEnv } = require('../config/env');

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Full error is logged server-side for debugging...
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);
  if (nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }

  // ...but never sent to the client. Stack traces, file paths, and
  // library-specific error internals must not leak to the caller.
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;

  res.status(status).json({
    success: false,
    message: status === 500 ? 'An unexpected error occurred' : err.message,
  });
}

module.exports = { notFound, errorHandler };
