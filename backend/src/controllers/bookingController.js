/**
 * Booking Controller - booking requests with a freelancer approval step.
 *
 *   client books          -> status "pending"  (NO transaction yet)
 *   freelancer approves   -> "approved"        (simulated transaction created now)
 *   freelancer rejects    -> "rejected"        (no transaction)
 *   client cancels        -> "cancelled"       (only while still pending)
 *   freelancer completes  -> "completed"       (only after approval)
 *
 * Money is only recorded once the freelancer has accepted the job, so income
 * (and the tax estimate built on it) never includes bookings that were
 * rejected or cancelled. The amount always comes from the gig's price on the
 * server - the client cannot choose what they pay.
 */
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');
const { logEvent } = require('../utils/logger');

// Each role only ever sees its own records; admins see everything.
const scopeFor = (user) => {
  if (user.role === 'client') return { client: user.id };
  if (user.role === 'freelancer') return { freelancer: user.id };
  return {};
};

const involves = (doc, user) =>
  user.role === 'admin' || String(doc.client) === String(user.id) || String(doc.freelancer) === String(user.id);

// action -> who may do it, from which statuses, and where the booking ends up.
const TRANSITIONS = {
  approve: { actor: 'freelancer', from: ['pending'], to: 'approved' },
  reject: { actor: 'freelancer', from: ['pending'], to: 'rejected' },
  cancel: { actor: 'client', from: ['pending'], to: 'cancelled' },
  complete: { actor: 'freelancer', from: ['approved'], to: 'completed' },
};

async function createBooking(req, res, next) {
  try {
    const gig = await Gig.findById(req.body.gigId);
    if (!gig || gig.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Gig not found or unavailable' });
    }

    const booking = await Booking.create({
      gig: gig.id,
      gigTitle: gig.title,
      price: gig.price,
      client: req.user.id,
      freelancer: String(gig.freelancer),
      note: req.body.note || '',
      status: 'pending',
    });

    logEvent('info', 'booking.created', req, {
      bookingId: String(booking.id),
      gigId: String(gig.id),
      freelancerId: String(gig.freelancer),
      amount: gig.price,
    });
    return res.status(201).json({
      success: true,
      message: 'Booking request sent. It is pending the freelancer\'s approval.',
      data: { booking },
    });
  } catch (err) {
    return next(err);
  }
}

// Creates the simulated payment record for an approved booking.
function createTransaction(booking) {
  return Transaction.create({
    reference: `TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    booking: booking.id,
    gig: String(booking.gig),
    client: String(booking.client),
    freelancer: String(booking.freelancer),
    amount: booking.price,
  });
}

// Builds the handler for one lifecycle action (approve/reject/cancel/complete).
function transition(action) {
  const rule = TRANSITIONS[action];

  return async function handle(req, res, next) {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      // Ownership: only the booking's own freelancer/client may act on it.
      if (String(booking[rule.actor]) !== String(req.user.id)) {
        logEvent('warn', 'authz.denied', req, { bookingId: String(booking.id), attempted: action });
        return res.status(403).json({ success: false, message: 'You do not have permission to modify this booking' });
      }

      const previousStatus = booking.status;
      if (!rule.from.includes(previousStatus)) {
        return res.status(409).json({
          success: false,
          message: `A ${previousStatus} booking cannot be ${rule.to === 'completed' ? 'marked completed' : rule.to}`,
        });
      }

      // Atomic claim: only succeeds if the status is still what we just read,
      // so two simultaneous approvals cannot both go through (no double transaction).
      const changes = { status: rule.to, decidedAt: new Date() };
      if (req.body && typeof req.body.note === 'string') changes.decisionNote = req.body.note;
      const updated = await Booking.findOneAndUpdate(
        { _id: booking.id, status: previousStatus },
        { $set: changes },
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(409).json({ success: false, message: 'This booking was changed by someone else. Please refresh.' });
      }

      let transaction;
      if (action === 'approve') {
        try {
          transaction = await createTransaction(updated);
          logEvent('info', 'transaction.created', req, {
            transactionId: String(transaction.id),
            reference: transaction.reference,
            bookingId: String(updated.id),
            amount: transaction.amount,
            clientId: String(updated.client),
            freelancerId: String(updated.freelancer),
          });
        } catch (txnErr) {
          // Never leave an approved booking without its transaction: undo the approval.
          await Booking.updateOne({ _id: booking.id }, { $set: { status: 'pending' }, $unset: { decidedAt: 1 } });
          throw txnErr;
        }
      }

      logEvent('info', `booking.${rule.to}`, req, { bookingId: String(updated.id), from: previousStatus });
      return res.status(200).json({
        success: true,
        message: `Booking ${rule.to}`,
        data: transaction ? { booking: updated, transaction } : { booking: updated },
      });
    } catch (err) {
      return next(err);
    }
  };
}

async function listBookings(req, res, next) {
  try {
    const filter = scopeFor(req.user);
    if (req.query.status) filter.status = req.query.status; // validated against the allowed statuses
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Bookings retrieved', data: { bookings } });
  } catch (err) {
    return next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!involves(booking, req.user)) {
      logEvent('warn', 'authz.denied', req, { bookingId: String(booking.id), attempted: 'view' });
      return res.status(403).json({ success: false, message: 'You do not have permission to view this booking' });
    }
    return res.status(200).json({ success: true, data: { booking } });
  } catch (err) {
    return next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    const transactions = await Transaction.find(scopeFor(req.user)).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Transactions retrieved', data: { transactions } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createBooking,
  approveBooking: transition('approve'),
  rejectBooking: transition('reject'),
  cancelBooking: transition('cancel'),
  completeBooking: transition('complete'),
  listBookings,
  getBooking,
  listTransactions,
};
