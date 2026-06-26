const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  status: { type: String, default: 'not_started' },
  score: { type: Number },
  score_data: { type: String },
  attempt_count: { type: Number, default: 0 },
  completed_at: { type: Date }
}, { versionKey: false });

// Enforce unique tracking combination per trainee and course module
ProgressSchema.index({ user_id: 1, module_id: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
