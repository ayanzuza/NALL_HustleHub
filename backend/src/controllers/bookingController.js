/**
 * Booking Controller
 * A booking by a client always produces a (simulated) transaction record
 * linking client, freelancer, gig and amount. The amount is taken from the
 * gig's price on the server - the client cannot choose what they pay.
 */
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');

// Each role only ever sees its own records; admins see everything.
const scopeFor = (user) => {
  if (user.role === 'client') return { client: user.id };
  if (user.role === 'freelancer') return { freelancer: user.id };
  return {};
};

const involves = (doc, user) =>
  user.role === 'admin' || String(doc.client) === String(user.id) || String(doc.freelancer) === String(user.id);

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
    });

    try {
      const transaction = await Transaction.create({
        reference: `TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        booking: booking.id,
        gig: gig.id,
        client: req.user.id,
        freelancer: String(gig.freelancer),
        amount: gig.price,
      });
      return res.status(201).json({
        success: true,
        message: 'Booking confirmed (simulated payment)',
        data: { booking, transaction },
      });
    } catch (txnErr) {
      // No multi-document transaction on a standalone MongoDB, so compensate:
      // never leave a booking behind without its transaction record.
      await Booking.deleteOne({ _id: booking.id });
      throw txnErr;
    }
  } catch (err) {
    return next(err);
  }
}

async function listBookings(req, res, next) {
  try {
    const bookings = await Booking.find(scopeFor(req.user)).sort({ createdAt: -1 });
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

module.exports = { createBooking, listBookings, getBooking, listTransactions };
