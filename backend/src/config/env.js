require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

// Fail fast if critical settings are missing rather than silently
// falling back to an insecure default.
const required = isTest ? ['JWT_SECRET'] : ['JWT_SECRET', 'MONGO_URI'];
for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

module.exports = {
  port: process.env.PORT || 5443,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  sslKeyPath: process.env.SSL_KEY_PATH || 'certs/key.pem',
  sslCertPath: process.env.SSL_CERT_PATH || 'certs/cert.pem',
  mongoUri: process.env.MONGO_URI,
  // Only these origins may call the API from a browser (the React app).
  corsOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Structured logging. Cloud shipping is optional and enabled only when
  // both LOG_HTTP_HOST and LOG_HTTP_TOKEN are set.
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    httpHost: process.env.LOG_HTTP_HOST || '',
    httpPath: process.env.LOG_HTTP_PATH || '/',
    httpToken: process.env.LOG_HTTP_TOKEN || '',
  },
  // Account lockout: after `threshold` consecutive failed logins the account
  // is locked for baseMs, doubling on each further lock up to maxMs.
  lockout: {
    threshold: num(process.env.LOCKOUT_THRESHOLD, 5),
    baseMs: num(process.env.LOCKOUT_BASE_MS, 15 * 60 * 1000),
    maxMs: num(process.env.LOCKOUT_MAX_MS, 24 * 60 * 60 * 1000),
  },
  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: num(process.env.RATE_LIMIT_AUTH_MAX, 20),
    bookingMax: num(process.env.RATE_LIMIT_BOOKING_MAX, 20),
    globalMax: num(process.env.RATE_LIMIT_GLOBAL_MAX, 300),
  },
};
