/**
 * Auth Controller
 * Handles user registration, login, and profile retrieval.
 * Passwords are hashed with bcrypt before storage; JWTs are issued
 * on successful registration/login and verified by authenticate.js
 * on every subsequent protected request.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userStore = require('../models/userStore');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existing = userStore.findByEmail(email);
    if (existing) {
      // Deliberately generic - confirms an account exists, but this
      // is a standard, accepted trade-off for registration flows
      // (the alternative of silent success breaks usability).
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = userStore.create({ name, email, passwordHash, role });
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userStore.toPublicUser(user),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = userStore.findByEmail(email);
    // Same generic message whether the email is unknown or the
    // password is wrong - prevents user enumeration.
    const invalidCredsResponse = () =>
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });

    if (!user) return invalidCredsResponse();

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return invalidCredsResponse();

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userStore.toPublicUser(user),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = userStore.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      data: { user: userStore.toPublicUser(user) },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, me };
