// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, maxLength: 150 },
  email: { type: String, required: true, unique: true, maxLength: 191 },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, default: 'user', maxLength: 30 },
  age: { type: Number },
  gender: { type: String, maxLength: 20 },
  height: { type: Number }, // cm
  weight: { type: Number }, // kg
  goal: { type: String },   // có thể JSON.stringify([...])
  status: { type: String, required: true, default: 'pending', maxLength: 20 }, // pending | active
}, {
  timestamps: true // tự động tạo createdAt và updatedAt
});

const User = mongoose.model('User', userSchema);

module.exports = User;
