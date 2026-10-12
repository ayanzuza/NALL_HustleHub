
const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/bookingController');

router.use(authenticate);

router.post(
  '/',
  bookingLimiter,
  authorize('client'),
  body('gigId').isMongoId(),
  body('date').optional().isISO8601(),
  body('note').optional().isString().isLength({ max: 1000 }),
  validateRequest,
  ctrl.createBooking
);

router.get('/', ctrl.listBookings);
router.get('/:id', param('id').isMongoId(), validateRequest, ctrl.getBooking);

module.exports = router;
