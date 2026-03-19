const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};
