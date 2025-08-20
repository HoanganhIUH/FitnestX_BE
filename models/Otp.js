// models/Otp.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const otpSchema = new Schema({
  email: { type: String, required: true, maxLength: 191 },
  code: { type: String, required: true, maxLength: 6 },
  expiresAt: { type: Date, required: true },
  consumed: { type: Boolean, required: true, default: false },
}, {
  timestamps: true // tự động tạo createdAt và updatedAt
});

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
