const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const {
  gigCreateValidation,
  gigUpdateValidation,
  gigListValidation,
  idParamValidation
} = require('../utils/validators');
const ctrl = require('../controllers/gigController');

// 1. Get current freelancer's own gigs (MUST be declared BEFORE /:id)
router.get(
  '/mine',
  authenticate,
  authorize('freelancer'),
  ctrl.listMyGigs
);

// 2. Public browsing
router.get(
  '/',
  gigListValidation,
  validateRequest,
  ctrl.listGigs
);

// 3. Get single gig by ID
router.get(
  '/:id',
  idParamValidation,
  validateRequest,
  ctrl.getGig
);

// 4. Create gig
router.post(
  '/',
  authenticate,
  authorize('freelancer'),
  gigCreateValidation,
  validateRequest,
  ctrl.createGig
);

// 5. Update own gig
router.put(
  '/:id',
  authenticate,
  authorize('freelancer'),
  gigUpdateValidation,
  validateRequest,
  ctrl.updateGig
);

// 6. Delete own gig
router.delete(
  '/:id',
  authenticate,
  authorize('freelancer'),
  idParamValidation,
  validateRequest,
  ctrl.deleteGig
);

module.exports = router;