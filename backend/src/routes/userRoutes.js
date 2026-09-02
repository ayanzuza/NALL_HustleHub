const express = require('express');
const { me } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Protected route - requires a valid JWT. Used to demonstrate that
// routes beyond login are guarded and the token is validated on
// every request.
router.get('/me', authenticate, me);

module.exports = router;
