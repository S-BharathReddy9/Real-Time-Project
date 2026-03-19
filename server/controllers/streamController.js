const streamService = require('../services/streamService');

exports.createStream = async (req, res, next) => {
  try {
    const stream = await streamService.createStream({ ...req.body, streamerId: req.user._id });
    res.status(201).json({ success: true, stream });
  } catch (err) { next(err); }
};

exports.getLiveStreams = async (req, res, next) => {
  try {
    const streams = await streamService.getLiveStreams();
    res.json({ success: true, streams });
  } catch (err) { next(err); }
};

exports.getStream = async (req, res, next) => {
  try {
    const stream = await streamService.getStreamById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ success: true, stream });
  } catch (err) { next(err); }
};

exports.goLive = async (req, res, next) => {
  try {
    const stream = await streamService.goLive(req.params.id, req.user._id);
    req.app.get('io').emit('stream:live', stream);
    res.json({ success: true, stream });
  } catch (err) { next(err); }
};

exports.endStream = async (req, res, next) => {
  try {
    const stream = await streamService.endStream(req.params.id, req.user._id);
    req.app.get('io').emit('stream:ended', stream);
    res.json({ success: true, stream });
  } catch (err) { next(err); }
};
