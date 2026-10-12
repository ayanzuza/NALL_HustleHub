/**
 * Auth Controller
 * Registration, login and profile retrieval. Passwords are hashed with
 * bcrypt before storage; a JWT (id + role) is issued on registration and
 * login and verified by authenticate.js on every protected request.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ id: String(user.id), role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: role || 'client' });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token: signToken(user) },
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Same generic message for unknown email and wrong password (no user enumeration).
    const invalid = () => res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return invalid();
    if (!(await bcrypt.compare(password, user.passwordHash))) return invalid();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token: signToken(user) },
    });
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

module.exports = { register, login, me };
