const express = require('express');
const ctrl = require('../controllers/gigController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { gigCreateValidation, gigUpdateValidation, gigListValidation, idParamValidation } = require('../utils/validators');

const router = express.Router();
router.use(authenticate); // every gig route requires a valid JWT

router.get('/', gigListValidation, validateRequest, ctrl.listGigs);
router.get('/mine', authorize('freelancer'), ctrl.myGigs); // must stay above '/:id'
router.get('/:id', idParamValidation, validateRequest, ctrl.getGig);
router.post('/', authorize('freelancer'), gigCreateValidation, validateRequest, ctrl.createGig);
router.put('/:id', authorize('freelancer'), gigUpdateValidation, validateRequest, ctrl.updateGig);
router.delete('/:id', authorize('freelancer'), idParamValidation, validateRequest, ctrl.deleteGig);

module.exports = router;
