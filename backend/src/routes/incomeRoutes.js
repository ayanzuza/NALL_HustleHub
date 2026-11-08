const express = require('express');
const { getIncome, getTaxSummary } = require('../controllers/incomeController');
const validateRequest = require('../middleware/validateRequest');
const { taxYearValidation } = require('../utils/validators');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();
router.get('/', authenticate, authorize('freelancer'), getIncome);
router.get('/tax', authenticate, authorize('freelancer'), taxYearValidation, validateRequest, getTaxSummary);

module.exports = router;
