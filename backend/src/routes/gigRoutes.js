
const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/gigController');

router.get('/', ctrl.listGigs);
router.get('/:id', ctrl.getGig);
router.post('/', authenticate, authorize('freelancer'), ctrl.createGig);

module.exports = router;
