const rateLimit = require('express-rate-limit');
const { rateLimit: cfg } = require('../config/env');

const make = (limit, message) =>
  rateLimit({
    windowMs: cfg.windowMs,
    limit,
    standardHeaders: true, // RateLimit-* headers so clients can see their budget
    legacyHeaders: false,
    message: { success: false, message },
  });

// Brute-force protection for register/login.
const authLimiter = make(cfg.authMax, 'Too many authentication attempts. Please try again later.');
// Protects the booking/transaction creation path from abuse.
const bookingLimiter = make(cfg.bookingMax, 'Too many booking requests. Please try again later.');
// Broad safety net for every other API route.
const globalLimiter = make(cfg.globalMax, 'Too many requests. Please slow down.');

module.exports = { authLimiter, bookingLimiter, globalLimiter };
