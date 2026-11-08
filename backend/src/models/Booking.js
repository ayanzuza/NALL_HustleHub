const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

// Booking lifecycle (see bookingController for who may trigger each move):
//   pending  -> approved | rejected   (freelancer decides)
//   pending  -> cancelled             (client withdraws before a decision)
//   approved -> completed             (freelancer marks the work delivered)
// rejected, cancelled and completed are final.
const BOOKING_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];

const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    // Snapshots: the booking stays meaningful even if the gig is edited/deleted later.
    gigTitle: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },
    // Optional message from the freelancer when approving/rejecting.
    decisionNote: { type: String, trim: true, maxlength: 500, default: '' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);
cleanJson(bookingSchema);

const Booking = mongoose.model('Booking', bookingSchema);
Booking.STATUSES = BOOKING_STATUSES;
module.exports = Booking;
