
const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const transactionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
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
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'ZAR',
      required: true
    },
    reference: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['simulated-paid', 'pending', 'failed'],
      default: 'simulated-paid',
      index: true
    }
  },
  { timestamps: true }
);

cleanJson(transactionSchema);

module.exports = mongoose.model('Transaction', transactionSchema);
