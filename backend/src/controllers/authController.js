/**
 * Auth Controller
 * Registration, login, logout and profile retrieval. Passwords are hashed
 * with bcrypt before storage; a JWT (id + role + unique jti) is issued on
 * registration and login and verified by authenticate.js on every protected
 * request.
 *
 * Part 3 security features implemented here:
 *  1. Account lockout with exponential backoff after repeated failed logins.
 *  2. Token revocation: logout stores the token's jti in a denylist so a
 *     stolen or discarded token stops working immediately.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const { jwtSecret, jwtExpiresIn, lockout } = require('../config/env');
const { logEvent, fingerprint } = require('../utils/logger');

const SALT_ROUNDS = 12;
const LOCK_FIELDS = '+passwordHash +failedLoginAttempts +lockCount +lockUntil';

function signToken(user) {
  return jwt.sign({ id: String(user.id), role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  });
}

// A real bcrypt hash of random data. Comparing against it when the account
// does not exist (or is locked) makes those requests take as long as a real
// check, so response time does not reveal whether an email is registered.
let dummyHashPromise;
const dummyHash = () => {
  if (!dummyHashPromise) dummyHashPromise = bcrypt.hash(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS);
  return dummyHashPromise;
};

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (await User.findOne({ email })) {
      logEvent('warn', 'auth.register_duplicate', req, { emailId: fingerprint(email) });
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: role || 'client' });

    logEvent('info', 'auth.register', req, { newUserId: String(user.id), newUserRole: user.role });
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token: signToken(user) },
    });
  } catch (err) {
    return next(err);
  }
}

// Counts a failed attempt atomically (so parallel guesses cannot slip past
// the counter) and locks the account once the threshold is reached. Each
// consecutive lock lasts twice as long as the previous one, up to a cap.
async function registerFailedLogin(user, req) {
  const updated = await User.findOneAndUpdate(
    { _id: user.id },
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  ).select('+failedLoginAttempts +lockCount');

  if (updated && updated.failedLoginAttempts >= lockout.threshold) {
    const durationMs = Math.min(lockout.baseMs * 2 ** (updated.lockCount || 0), lockout.maxMs);
    await User.updateOne(
      { _id: user.id },
      {
        $set: { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + durationMs) },
        $inc: { lockCount: 1 },
      }
    );
    logEvent('warn', 'auth.account_locked', req, {
      lockedUserId: String(user.id),
      lockMinutes: Math.round(durationMs / 60000),
    });
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const emailId = fingerprint(email);

    // One generic response for every failure (unknown email, wrong password,
    // locked account) so nothing about the account's state is revealed.
    const invalid = () => res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = await User.findOne({ email }).select(LOCK_FIELDS);
    const passwordMatches = await bcrypt.compare(password, user ? user.passwordHash : await dummyHash());

    if (!user) {
      logEvent('warn', 'auth.login_failed', req, { reason: 'unknown_user', emailId });
      return invalid();
    }

    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      // Even the correct password is refused while locked.
      logEvent('warn', 'auth.login_blocked', req, { reason: 'account_locked', emailId, lockedUserId: String(user.id) });
      return invalid();
    }

    if (!passwordMatches) {
      logEvent('warn', 'auth.login_failed', req, { reason: 'bad_password', emailId, lockedUserId: String(user.id) });
      await registerFailedLogin(user, req);
      return invalid();
    }

    if (user.failedLoginAttempts || user.lockCount || user.lockUntil) {
      await User.updateOne(
        { _id: user.id },
        { $set: { failedLoginAttempts: 0, lockCount: 0 }, $unset: { lockUntil: 1 } }
      );
    }

    logEvent('info', 'auth.login_success', req, { loggedInUserId: String(user.id), loggedInRole: user.role });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token: signToken(user) },
    });
  } catch (err) {
    return next(err);
  }
}

// Revokes the token used for this request. Only the jti is stored, and only
// until the token would have expired on its own.
async function logout(req, res, next) {
  try {
    try {
      await RevokedToken.create({ jti: req.user.jti, expiresAt: new Date(req.user.exp * 1000) });
    } catch (err) {
      if (err.code !== 11000) throw err; // already revoked - logging out twice is harmless
    }
    logEvent('info', 'auth.logout', req);
    return res.status(200).json({ success: true, message: 'Logged out. This token can no longer be used.' });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me };
