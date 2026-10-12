const express = require('express');
const ctrl = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { bookingValidation, idParamValidation } = require('../utils/validators');

const router = express.Router();
router.use(authenticate);

router.post('/', bookingLimiter, authorize('client'), bookingValidation, validateRequest, ctrl.createBooking);
router.get('/', ctrl.listBookings); // scoped by role inside the controller
router.get('/:id', idParamValidation, validateRequest, ctrl.getBooking);

module.exports = router;
