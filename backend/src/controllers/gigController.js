/**
 * Gig Controller
 * Freelancers manage ONLY their own gigs (ownership is checked on every
 * update/delete). Any authenticated user can browse active gigs.
 */
const Gig = require('../models/Gig');

const EDITABLE_FIELDS = ['title', 'description', 'category', 'price', 'status'];

// Whitelist fields so clients can never set freelancer/_id/etc. (mass assignment).
const pick = (source, fields) =>
  Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));

const isOwner = (gig, user) => String(gig.freelancer) === String(user.id);

async function listGigs(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = { status: 'active' };
    if (req.query.category) filter.category = req.query.category;

    const gigs = await Gig.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({ success: true, message: 'Gigs retrieved', data: { gigs, page, limit } });
  } catch (err) {
    return next(err);
  }
}

async function myGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Your gigs retrieved', data: { gigs } });
  } catch (err) {
    return next(err);
  }
}

async function getGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    // Paused gigs are only visible to their owner and admins.
    const visible = gig && (gig.status === 'active' || req.user.role === 'admin' || isOwner(gig, req.user));
    if (!visible) return res.status(404).json({ success: false, message: 'Gig not found' });
    return res.status(200).json({ success: true, data: { gig } });
  } catch (err) {
    return next(err);
  }
}

async function createGig(req, res, next) {
  try {
    const gig = await Gig.create({
      ...pick(req.body, ['title', 'description', 'category', 'price']),
      freelancer: req.user.id, // always taken from the verified token, never the body
    });
    return res.status(201).json({ success: true, message: 'Gig created', data: { gig } });
  } catch (err) {
    return next(err);
  }
}

async function updateGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (!isOwner(gig, req.user)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to modify this gig' });
    }
    Object.assign(gig, pick(req.body, EDITABLE_FIELDS));
    await gig.save();
    return res.status(200).json({ success: true, message: 'Gig updated', data: { gig } });
  } catch (err) {
    return next(err);
  }
}

async function deleteGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (!isOwner(gig, req.user)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this gig' });
    }
    await Gig.deleteOne({ _id: gig.id });
    return res.status(200).json({ success: true, message: 'Gig deleted' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listGigs, myGigs, getGig, createGig, updateGig, deleteGig };
