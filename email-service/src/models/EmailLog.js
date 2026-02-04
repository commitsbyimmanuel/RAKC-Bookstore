const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  template: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['payment_reminder', 'order_confirmation', 'general'],
  },
  status: {
    type: String,
    required: true,
    enum: ['sent', 'failed'],
  },
  messageId: {
    type: String,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
emailLogSchema.index({ sentAt: -1 });
emailLogSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
