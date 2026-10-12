
const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/incomeController');

router.get(
  '/',
  authenticate,
  authorize('freelancer'),
  ctrl.getIncome
);

module.exports = router;
