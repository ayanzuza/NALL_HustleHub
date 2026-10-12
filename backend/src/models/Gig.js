const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const CATEGORIES = ['design', 'development', 'writing', 'marketing', 'video', 'audio', 'business', 'other'];

const gigSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    category: { type: String, enum: CATEGORIES, required: true },
    price: { type: Number, required: true, min: 1, max: 1000000 },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
  },
  { timestamps: true }
);
cleanJson(gigSchema);

const Gig = mongoose.model('Gig', gigSchema);
Gig.CATEGORIES = CATEGORIES;
module.exports = Gig;
