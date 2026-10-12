
const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const gigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },
    category: {
      type: String,
      required: true,
      enum: [
        'design',
        'development',
        'writing',
        'marketing',
        'video',
        'audio',
        'business',
        'other'
      ]
    },
    price: {
      type: Number,
      required: true,
      min: 1,
      max: 1000000
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

cleanJson(gigSchema);

module.exports = mongoose.model('Gig', gigSchema);
