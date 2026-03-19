const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'streamsphere_secret';

exports.generateToken = (id) =>
  jwt.sign({ id }, SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

exports.verifyToken = (token) => jwt.verify(token, SECRET);
