const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * Verifies the Bearer token on every protected request. On success,
 * attaches the decoded payload (id, role) to req.user for use by
 * downstream role-based access control.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      // Same generic message for expired/invalid/malformed tokens -
      // avoids leaking which specific check failed.
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
    req.user = decoded; // { id, role }
    next();
  });
}

module.exports = authenticate;
