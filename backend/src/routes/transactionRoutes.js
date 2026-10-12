const express = require('express');
const { listTransactions } = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.get('/', authenticate, listTransactions); // scoped by role inside the controller

module.exports = router;
