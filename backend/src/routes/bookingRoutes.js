const express = require('express');
const ctrl = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { bookingLimiter, bookingActionLimiter } = require('../middleware/rateLimiter');
const { bookingValidation, bookingListValidation, bookingDecisionValidation } = require('../utils/validators');
const { idParamValidation } = require('../utils/validators');

const router = express.Router();
router.use(authenticate);

router.post('/', bookingLimiter, authorize('client'), bookingValidation, validateRequest, ctrl.createBooking);
router.get('/', bookingListValidation, validateRequest, ctrl.listBookings); // scoped by role inside the controller
router.get('/:id', idParamValidation, validateRequest, ctrl.getBooking);

// Approval workflow. authorize() blocks the wrong role; the controller then
// checks the booking really belongs to the caller and is in a valid state.
router.patch('/:id/approve', bookingActionLimiter, authorize('freelancer'), bookingDecisionValidation, validateRequest, ctrl.approveBooking);
router.patch('/:id/reject', bookingActionLimiter, authorize('freelancer'), bookingDecisionValidation, validateRequest, ctrl.rejectBooking);
router.patch('/:id/complete', bookingActionLimiter, authorize('freelancer'), bookingDecisionValidation, validateRequest, ctrl.completeBooking);
router.patch('/:id/cancel', bookingActionLimiter, authorize('client'), bookingDecisionValidation, validateRequest, ctrl.cancelBooking);

module.exports = router;
