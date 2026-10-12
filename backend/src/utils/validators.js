/**
 * Validation Rules
 * Strict allow-list validation for every input. Rejecting bad input up
 * front is safer than trying to repair it later. Every field is also
 * checked to be a string/number so object payloads such as
 * {"$gt": ""} (NoSQL operator injection) are refused outright.
 */
const { body, param, query } = require('express-validator');

const CATEGORIES = ['design', 'development', 'writing', 'marketing', 'video', 'audio', 'business', 'other'];

const registerValidation = [
  body('name')
    .isString().withMessage('Name is required')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),

  body('email')
    .isString().withMessage('A valid email address is required')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password is required')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
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
    .isString().withMessage('A valid email address is required')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password is required')
    .notEmpty().withMessage('Password is required'),
];

const idParamValidation = [param('id').isMongoId().withMessage('Invalid id')];

const gigCreateValidation = [
  body('title')
    .isString().withMessage('Title is required').trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .isString().withMessage('Description is required').trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('price')
    .isFloat({ min: 1, max: 1000000 }).withMessage('Price must be a number between 1 and 1000000')
    .toFloat(),
];

const gigUpdateValidation = [
  ...idParamValidation,
  body('title').optional().isString().trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().isString().trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').optional().isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('price').optional().isFloat({ min: 1, max: 1000000 })
    .withMessage('Price must be a number between 1 and 1000000').toFloat(),
  body('status').optional().isIn(['active', 'paused']).withMessage('Status must be active or paused'),
];

const gigListValidation = [
  query('category').optional().isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50').toInt(),
];

const bookingValidation = [
  body('gigId').isMongoId().withMessage('A valid gigId is required'),
  body('note').optional().isString().withMessage('Note must be text').trim()
    .isLength({ max: 500 }).withMessage('Note must be at most 500 characters'),
];

module.exports = {
  CATEGORIES,
  registerValidation,
  loginValidation,
  idParamValidation,
  gigCreateValidation,
  gigUpdateValidation,
  gigListValidation,
  bookingValidation,
};
