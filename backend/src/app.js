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
const requestId = require('./middleware/requestId');
const { logger } = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { nodeEnv, corsOrigins } = require('./config/env');

const app = express();

// Every request gets a server-generated id for log correlation.
app.use(requestId);

// Security headers. This is a JSON API (it never serves HTML, scripts, styles,
// images or fonts), so the Content-Security-Policy denies every resource type
// outright. If a response were ever rendered by a browser (for example an
// injected HTML error page), it could load nothing and run nothing.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"], // fallback: block anything not listed below
        scriptSrc: ["'none'"], // no JavaScript (blocks XSS payloads from executing)
        scriptSrcAttr: ["'none'"], // no inline event handlers such as onclick
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        fontSrc: ["'none'"],
        mediaSrc: ["'none'"],
        connectSrc: ["'none'"], // no fetch/XHR/WebSocket from a rendered response
        objectSrc: ["'none'"], // no plugins (Flash/Java applets/embeds)
        frameSrc: ["'none'"], // cannot embed other pages
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        manifestSrc: ["'none'"],
        baseUri: ["'none'"], // stops <base> tag hijacking of relative URLs
        formAction: ["'none'"], // forms cannot post anywhere
        frameAncestors: ["'none'"], // cannot be framed (clickjacking)
        upgradeInsecureRequests: [], // any http sub-request is upgraded to https
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Headers Helmet does not set: switch off powerful browser features, and make
// sure responses carrying personal/financial data are never cached by browsers
// or shared proxies.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Only the configured frontend origin(s) may call the API from a browser.
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = non-browser client (Postman, curl, server-to-server).
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitize);

// HTTP access log, written through the structured logger (JSON) so it is
// shipped to the same place as the security events. Query strings are cut off
// so nothing sensitive that ended up in a URL is stored.
if (nodeEnv !== 'test') {
  morgan.token('safe-url', (req) => req.originalUrl.split('?')[0]);
  morgan.token('request-id', (req) => req.id);
  app.use(
    morgan(':request-id :remote-addr :method :safe-url :status :res[content-length] - :response-time ms', {
      stream: { write: (line) => logger.info(line.trim(), { event: 'http.request' }) },
    })
  );
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
