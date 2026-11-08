/**
 * Structured security/event logger (Winston).
 *
 * - Every entry is one JSON object (timestamp, level, event, requestId, ...),
 *   which Docker captures from stdout and a log platform can index.
 * - Optional cloud shipping: set LOG_HTTP_HOST and LOG_HTTP_TOKEN (and
 *   LOG_HTTP_PATH if needed) to also send entries to an HTTP log-ingest
 *   endpoint such as Better Stack. If the platform is unreachable the app
 *   keeps running - log shipping must never take the API down.
 * - Sensitive values (passwords, tokens, authorization headers, hashes) are
 *   stripped by redact() before anything is written.
 */
const crypto = require('crypto');
const winston = require('winston');
const { nodeEnv, logging } = require('../config/env');

const SENSITIVE_KEYS = /pass(word)?|token|secret|authorization|cookie|hash|jwt/i;

// Replaces the value of any sensitive-looking key, at any depth.
function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

// Emails are personal data: log a short stable fingerprint so repeated
// attempts against one account can be correlated without storing the address.
function fingerprint(value) {
  if (!value || typeof value !== 'string') return undefined;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 12);
}

// Masks sensitive fields IN PLACE. (Building a new object here would drop
// Winston's internal level/message symbols and every transport would silently
// discard the entry.)
const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === 'level' || key === 'message' || key === 'timestamp') continue;
    info[key] = SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(info[key]);
  }
  return info;
});

const transports = [
  new winston.transports.Console({ silent: nodeEnv === 'test' }),
];

if (logging.httpHost && logging.httpToken && nodeEnv !== 'test') {
  const http = new winston.transports.Http({
    host: logging.httpHost,
    path: logging.httpPath,
    ssl: true,
    port: 443,
    auth: { bearer: logging.httpToken },
    batch: true,
    batchInterval: 5000,
    batchCount: 20,
  });
  http.on('error', () => {}); // never let a log-platform outage crash the API
  transports.push(http);
}

const logger = winston.createLogger({
  level: logging.level,
  defaultMeta: { service: 'hustlehub-api' },
  format: winston.format.combine(winston.format.timestamp(), redactFormat(), winston.format.json()),
  transports,
});

/**
 * Logs a named domain event. `req` is optional; when given, the request id,
 * client IP and (if authenticated) user id/role are attached automatically.
 */
function logEvent(level, event, req, meta = {}) {
  const ctx = req
    ? {
        requestId: req.id,
        ip: req.ip,
        userId: req.user && req.user.id,
        role: req.user && req.user.role,
      }
    : {};
  logger.log(level, event, { event, ...ctx, ...meta });
}

module.exports = { logger, logEvent, redact, fingerprint };
