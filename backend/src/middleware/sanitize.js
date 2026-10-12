const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// Strip all HTML; drop <script>/<style> including their contents.
const XSS_OPTIONS = { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] };

// These fields are already constrained by strict allow-list/format validation
// (regex, isEmail, isIn) or must never be altered (passwords), so they are
// rejected by validation rather than rewritten here.
const SKIP_KEYS = new Set(['password', 'name', 'email', 'role']);

function clean(value, key) {
  if (typeof value === 'string') {
    return SKIP_KEYS.has(key) ? value : xss(value, XSS_OPTIONS);
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v, k)]));
  }
  return value;
}

function xssClean(req, res, next) {
  if (req.body) req.body = clean(req.body);
  next();
}

// 1) remove keys beginning with "$" or containing "." (NoSQL operator injection)
// 2) strip HTML/script from free-text fields (stored XSS)
module.exports = [mongoSanitize(), xssClean];
