
const mongoose = require('mongoose');
const crypto = require('crypto');

const Gig = require('../models/Gig');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');

async function createBooking(req, res, next) {
  try {
    if (String(req.user.role).toLowerCase() !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can book gigs'
      });
    }

    const { gigId, date, note } = req.body;

    // If no date is supplied, default to 24 hours from now.
    const bookingDateInput =
      date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (
      !mongoose.isValidObjectId(gigId) ||
      !Number.isFinite(Date.parse(bookingDateInput))
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid gigId and booking date are required'
      });
    }

    const bookingDate = new Date(bookingDateInput);

    if (bookingDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be in the future'
      });
    }

    const gig = await Gig.findById(gigId);

    if (!gig || gig.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Available gig not found'
      });
    }

    if (String(gig.freelancerId) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own gig'
      });
    }

    // Always use the server-side gig price, never a client-supplied amount.
    const booking = await Booking.create({
      clientId: req.user.id,
      freelancerId: gig.freelancerId,
      gigId: gig._id,
      date: bookingDate,
      note: typeof note === 'string' ? note.trim() : '',
      amount: gig.price,
      status: 'confirmed'
    });

    let transaction;

    try {
      transaction = await Transaction.create({
        bookingId: booking._id,
        clientId: req.user.id,
        freelancerId: gig.freelancerId,
        amount: gig.price,
        currency: 'ZAR',
        reference: `HH-${crypto.randomUUID()}`,
        status: 'simulated-paid'
      });
    } catch (transactionError) {
      // Avoid leaving a confirmed booking without its simulated transaction.
      if (typeof Booking.deleteOne === 'function') {
        await Booking.deleteOne({ _id: booking._id });
      }
      throw transactionError;
    }

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed; simulated payment recorded',
      data: { booking, transaction }
    });
  } catch (err) {
    return next(err);
  }
}

async function listBookings(req, res, next) {
  try {
    const role = String(req.user.role).toLowerCase();
    let filter;

    if (role === 'client') {
      filter = { clientId: req.user.id };
    } else if (role === 'freelancer') {
      filter = { freelancerId: req.user.id };
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view bookings'
      });
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Bookings retrieved',
      data: { bookings }
    });
  } catch (err) {
    return next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const userId = String(req.user.id);

    if (
      userId !== String(booking.clientId) &&
      userId !== String(booking.freelancerId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this booking'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking retrieved',
      data: { booking }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createBooking,
  listBookings,
  getBooking
};
