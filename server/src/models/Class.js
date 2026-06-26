const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  trainees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false });

module.exports = mongoose.model('Class', ClassSchema);
