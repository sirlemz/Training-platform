const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'trainee'], default: 'trainee' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false });

module.exports = mongoose.model('User', UserSchema);
