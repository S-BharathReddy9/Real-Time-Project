const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  stream:  { type: mongoose.Schema.Types.ObjectId, ref: 'Stream', required: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
  type:    { type: String, enum: ['chat', 'system'], default: 'chat' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
