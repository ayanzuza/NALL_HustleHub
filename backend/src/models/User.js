const mongoose = require('mongoose');
const cleanJson = require('./cleanJson');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false -> the hash is only loaded when explicitly requested (login).
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], default: 'client' },
  },
  { timestamps: true }
);
cleanJson(userSchema);

module.exports = mongoose.model('User', userSchema);
