const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  streamer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  thumbnail:   { type: String, default: '' },
  category:    { type: String, default: 'General' },
  tags:        [{ type: String }],
  isLive:      { type: Boolean, default: false },
  viewerCount: { type: Number, default: 0 },
  startedAt:   { type: Date },
  endedAt:     { type: Date },
  streamKey:   { type: String, unique: true, sparse: true },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stream', streamSchema);
