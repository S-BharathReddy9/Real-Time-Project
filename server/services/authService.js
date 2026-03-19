const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

exports.registerUser = async ({ username, email, password }) => {
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) throw { statusCode: 400, message: 'User already exists' };
  const user = await User.create({ username, email, password });
  return { user, token: generateToken(user._id) };
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password)))
    throw { statusCode: 401, message: 'Invalid credentials' };
  return { user, token: generateToken(user._id) };
};
