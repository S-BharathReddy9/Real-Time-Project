const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.status(201).json({ success: true, user, token });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.json({ success: true, user, token });
  } catch (err) { next(err); }
};

exports.getMe = (req, res) => res.json({ success: true, user: req.user });
