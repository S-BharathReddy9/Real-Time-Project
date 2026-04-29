const Stream = require('../models/Stream');
const chatService = require('./chatService');

exports.createStream = async ({ title, description, category, tags, streamerId }) => {
  const streamKey = require('crypto').randomBytes(16).toString('hex');
  return Stream.create({ title, description, category, tags, streamer: streamerId, streamKey });
};

exports.getLiveStreams = () =>
  Stream.find({ isLive: true }).populate('streamer', 'username avatar').sort({ viewerCount: -1 });

exports.getStreamById = (id) =>
  Stream.findById(id).populate('streamer', 'username avatar bio');

exports.goLive = async (streamId, userId) => {
  const stream = await Stream.findOne({ _id: streamId, streamer: userId });
  if (!stream) throw { statusCode: 404, message: 'Stream not found' };
  stream.isLive = true;
  stream.startedAt = new Date();
  return stream.save();
};

exports.endStream = async (streamId, userId) => {
  const stream = await Stream.findOne({ _id: streamId, streamer: userId });
  if (!stream) throw { statusCode: 404, message: 'Stream not found' };
  stream.isLive = false;
  stream.endedAt = new Date();
  const savedStream = await stream.save();
  await chatService.deleteStreamMessages(streamId);
  return savedStream;
};
