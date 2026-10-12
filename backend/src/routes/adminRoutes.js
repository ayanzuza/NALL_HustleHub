const express = require('express');
const ctrl = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { idParamValidation } = require('../utils/validators');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/users', ctrl.listUsers);
router.delete('/gigs/:id', idParamValidation, validateRequest, ctrl.removeGig);

module.exports = router;
