const User = require('../models/User');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { bio, avatar }, { new: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.followUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!target.followers.includes(req.user._id)) {
      target.followers.push(req.user._id);
      await req.user.updateOne({ $push: { following: target._id } });
      await target.save();
    }
    res.json({ success: true, message: 'Followed' });
  } catch (err) { next(err); }
};
