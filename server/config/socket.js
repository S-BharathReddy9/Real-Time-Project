const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatSocket = require('../sockets/chatSocket');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'streamsphere_secret');
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user?.id}`);
    chatSocket(io, socket);
    socket.on('disconnect', () => console.log(`❌ User disconnected: ${socket.user?.id}`));
  });

  return io;
};

module.exports = initSocket;
