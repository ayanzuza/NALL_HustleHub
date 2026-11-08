const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { registerValidation, loginValidation } = require('../utils/validators');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, registerValidation, validateRequest, register);
router.post('/login', authLimiter, loginValidation, validateRequest, login);
router.post('/logout', authenticate, logout); // revokes the presented token

module.exports = router;
