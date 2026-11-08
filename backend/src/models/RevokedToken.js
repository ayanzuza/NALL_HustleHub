const mongoose = require('mongoose');

// Denylist of JWTs that were logged out before they expired. Only the token
// id (jti) is stored, never the token itself. MongoDB removes each entry
// automatically once the token would have expired anyway (TTL index), so the
// collection stays small.
const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
