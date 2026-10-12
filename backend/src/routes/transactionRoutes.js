
const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/transactionController');

router.use(authenticate);
router.get('/', ctrl.listTransactions);
router.get('/:id', ctrl.getTransaction);

module.exports = router;
