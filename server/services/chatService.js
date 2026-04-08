const Message = require('../models/Message');

exports.saveMessage = ({ streamId, senderId, content }) =>
  Message.create({ stream: streamId, sender: senderId, content });

exports.getStreamMessages = (streamId, limit = 50) =>
  Message.find({ stream: streamId })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .then((msgs) => msgs.reverse());

exports.deleteStreamMessages = (streamId) =>
  Message.deleteMany({ stream: streamId });
