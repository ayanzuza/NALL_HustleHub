const http = require('http');
const { nodeEnv } = require('../config/env');

/**
 * Centralised Error Handling
 * notFound() catches unmatched routes with a consistent 404 shape.
 * errorHandler() logs the full error server-side (stack trace in
 * development only) and returns a safe, generic JSON message to the
 * client -- never a stack trace, file path, parser detail or config value.
 */
function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Resource not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);
  if (nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }

  let status = 500;
  let message = 'An unexpected error occurred';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier or value';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists';
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    status = err.status;
    message = http.STATUS_CODES[err.status] || 'Request error';
  }

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
