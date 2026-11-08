const rateLimit = require('express-rate-limit');
const { rateLimit: cfg } = require('../config/env');
const { logEvent } = require('../utils/logger');

const make = (limit, message, name) =>
  rateLimit({
    windowMs: cfg.windowMs,
    limit,
    standardHeaders: true, // RateLimit-* headers so clients can see their budget
    legacyHeaders: false,
    // Same response as before, plus a log entry so abuse shows up in monitoring.
    handler: (req, res, next, options) => {
      logEvent('warn', 'ratelimit.exceeded', req, { limiter: name, method: req.method, path: req.originalUrl.split('?')[0] });
      res.status(options.statusCode).json({ success: false, message });
    },
  });

// Brute-force protection for register/login.
const authLimiter = make(cfg.authMax, 'Too many authentication attempts. Please try again later.', 'auth');
// Protects the booking/transaction creation path from abuse.
const bookingLimiter = make(cfg.bookingMax, 'Too many booking requests. Please try again later.', 'booking');
// Approve/reject/cancel/complete actions get their own, roomier budget so a
// busy freelancer is not throttled by the clients' booking requests.
const bookingActionLimiter = make(cfg.bookingMax * 3, 'Too many booking actions. Please try again later.', 'booking-action');
// Broad safety net for every other API route.
const globalLimiter = make(cfg.globalMax, 'Too many requests. Please slow down.', 'global');

module.exports = { authLimiter, bookingLimiter, bookingActionLimiter, globalLimiter };
