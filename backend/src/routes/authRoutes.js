const express = require('express');
const { register, login } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);

module.exports = router;
