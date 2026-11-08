const crypto = require('crypto');

// Gives every request a unique id so all log lines for one request can be
// correlated. The id is generated server-side (a client-supplied id is never
// trusted) and returned in X-Request-Id to help support/debugging.
function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
