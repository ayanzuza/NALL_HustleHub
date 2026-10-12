const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    // Snapshots: the booking stays meaningful even if the gig is edited/deleted later.
    gigTitle: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ['confirmed'], default: 'confirmed' },
  },
  { timestamps: true }
);
cleanJson(bookingSchema);

module.exports = mongoose.model('Booking', bookingSchema);
