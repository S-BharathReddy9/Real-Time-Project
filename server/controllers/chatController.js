const chatService = require('../services/chatService');

exports.getMessages = async (req, res, next) => {
  try {
    const messages = await chatService.getStreamMessages(req.params.streamId);
    res.json({ success: true, messages });
  } catch (err) { next(err); }
};
