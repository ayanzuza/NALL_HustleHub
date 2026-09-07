/**
 * Registration & Login Validation Rules
 * Enforces well-formed emails, a safe character set for names
 * (blocking script/HTML injection attempts), a minimum-strength
 * password policy, and an allow-list for roles (admin cannot be
 * self-assigned at registration).
 */

const { body } = require('express-validator');

// Validation rules are intentionally strict: rejecting bad input up
// front is cheaper and safer than trying to sanitise it later, and
// it prevents malformed/oversized data from ever reaching business logic.

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),

  body('role')
    .optional()
    .isIn(['client', 'freelancer']).withMessage('Role must be either client or freelancer'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

module.exports = { registerValidation, loginValidation };
