const chatService = require('../services/chatService');

// Track streamers per room: streamId -> socketId
const streamers = {};

module.exports = (io, socket) => {

  // ─── Room ───────────────────────────────────────────
  socket.on('join:stream', ({ streamId }) => {
    socket.join(streamId);
    socket.data.streamId = streamId;

    // Tell this viewer if there's already a live streamer in the room
    if (streamers[streamId]) {
      socket.emit('streamer:present', { streamerId: streamers[streamId] });
    }

    // Notify everyone else
    socket.to(streamId).emit('user:joined', {
      userId:   socket.user.id,
      username: socket.user.username,
    });

    // Update viewer count for room
    const count = io.sockets.adapter.rooms.get(streamId)?.size || 0;
    io.to(streamId).emit('viewer:count', { count });

    console.log(`[room] ${socket.user.username} joined ${streamId}`);
  });

  socket.on('leave:stream', ({ streamId }) => {
    socket.leave(streamId);
    socket.to(streamId).emit('user:left', { userId: socket.user.id });
    const count = io.sockets.adapter.rooms.get(streamId)?.size || 0;
    io.to(streamId).emit('viewer:count', { count });
  });

  // ─── Chat ────────────────────────────────────────────
  socket.on('chat:message', async ({ streamId, content }) => {
    try {
      const message  = await chatService.saveMessage({ streamId, senderId: socket.user.id, content });
      const populated = await message.populate('sender', 'username avatar');
      io.to(streamId).emit('chat:message', {
        _id:       populated._id,
        content:   populated.content,
        sender:    populated.sender,
        createdAt: populated.createdAt,
      });
    } catch {
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  // ─── WebRTC Signaling ────────────────────────────────
  // Streamer announces they are live
  socket.on('webrtc:start', ({ streamId }) => {
    streamers[streamId] = socket.id;
    socket.data.isStreamer = true;
    socket.data.streamId   = streamId;
    socket.to(streamId).emit('streamer:present', { streamerId: socket.id });
    console.log(`[webrtc] streamer ${socket.user.username} started ${streamId}`);
  });

  // Viewer requests to connect → tell the streamer
  socket.on('webrtc:viewer-ready', ({ streamId }) => {
    const streamerId = streamers[streamId];
    if (!streamerId) return;
    io.to(streamerId).emit('webrtc:viewer-ready', {
      viewerId:  socket.id,
      viewerName: socket.user.username,
    });
  });

  // Streamer sends offer to a specific viewer
  socket.on('webrtc:offer', ({ viewerId, offer }) => {
    io.to(viewerId).emit('webrtc:offer', { streamerId: socket.id, offer });
  });

  // Viewer sends answer back to streamer
  socket.on('webrtc:answer', ({ streamerId, answer }) => {
    io.to(streamerId).emit('webrtc:answer', { viewerId: socket.id, answer });
  });

  // ICE candidates (both directions)
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice', { fromId: socket.id, candidate });
  });

  // Streamer ended
  socket.on('webrtc:stop', ({ streamId }) => {
    delete streamers[streamId];
    socket.to(streamId).emit('streamer:ended');
    console.log(`[webrtc] stream ended ${streamId}`);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const streamId = socket.data.streamId;
    if (streamId) {
      if (socket.data.isStreamer) {
        delete streamers[streamId];
        socket.to(streamId).emit('streamer:ended');
      }
      const count = io.sockets.adapter.rooms.get(streamId)?.size || 0;
      io.to(streamId).emit('viewer:count', { count });
    }
  });
};
