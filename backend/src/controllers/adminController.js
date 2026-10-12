/**
 * Admin Controller - moderation capabilities reserved for the admin role.
 */
const User = require('../models/User');
const Gig = require('../models/Gig');

async function listUsers(req, res, next) {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Users retrieved', data: { users } });
  } catch (err) {
    return next(err);
  }
}

async function removeGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    await Gig.deleteOne({ _id: gig.id });
    return res.status(200).json({ success: true, message: 'Gig removed by admin' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers, removeGig };
