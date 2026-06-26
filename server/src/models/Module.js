const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  content: { type: String },
  description: { type: String },
  sequence_order: { type: Number, default: 0 },
  allow_retake: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false });

module.exports = mongoose.model('Module', ModuleSchema);
