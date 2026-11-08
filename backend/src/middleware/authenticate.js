/**
 * JWT Authentication Middleware
 * Extracts and verifies the Bearer token on protected routes.
 * On success, attaches { id, role, jti, exp } to req.user for downstream
 * role-based access control. Rejects missing, malformed, invalid, expired
 * or revoked (logged-out) tokens with a single generic 401 response.
 */

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const RevokedToken = require('../models/RevokedToken');
const { logEvent } = require('../utils/logger');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Same generic message for expired/invalid/malformed/revoked tokens -
  // avoids leaking which specific check failed.
  const reject = (reason) => {
    logEvent('warn', 'auth.token_rejected', req, { reason });
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  };

  let decoded;
  try {
    // Only the algorithm we sign with is accepted (blocks algorithm-confusion tricks).
    decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    return reject(err.name === 'TokenExpiredError' ? 'expired' : 'invalid');
  }

  // Tokens without a jti cannot be revoked, so they are not accepted.
  if (!decoded.jti) return reject('missing_jti');

  try {
    if (await RevokedToken.findOne({ jti: decoded.jti })) return reject('revoked');
  } catch (err) {
    // Fail closed: if the denylist cannot be checked, do not let the request through.
    return next(err);
  }

  req.user = decoded; // { id, role, jti, iat, exp }
  return next();
}

module.exports = authenticate;
