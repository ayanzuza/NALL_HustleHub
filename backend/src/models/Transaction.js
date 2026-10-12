const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZAR' },
    // Payments are simulated for this POE - no real payment provider is called.
    status: { type: String, enum: ['simulated-paid'], default: 'simulated-paid' },
  },
  { timestamps: true }
);
cleanJson(transactionSchema);

module.exports = mongoose.model('Transaction', transactionSchema);
