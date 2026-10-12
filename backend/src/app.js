const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sanitize = require('./middleware/sanitize');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { nodeEnv, corsOrigins } = require('./config/env');

const app = express();

// Security headers. This is a JSON API (it never serves HTML), so the
// Content-Security-Policy denies every resource type and framing outright.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Only the configured frontend origin(s) may call the API from a browser.
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = non-browser client (Postman, curl, server-to-server).
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitize);

if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running' });
});

app.use('/api', globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
