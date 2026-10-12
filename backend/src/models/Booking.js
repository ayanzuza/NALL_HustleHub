
const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
      index: true
    }
  },
  { timestamps: true }
);

cleanJson(bookingSchema);

module.exports = mongoose.model('Booking', bookingSchema);
