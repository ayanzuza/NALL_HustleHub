const express = require('express');
const { getIncome } = require('../controllers/incomeController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();
router.get('/', authenticate, authorize('freelancer'), getIncome);

module.exports = router;
