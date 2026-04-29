const chatService = require('../services/chatService');
const streamService = require('../services/streamService');

// Track streamers per room: streamId -> socketId
const streamers = {};

module.exports = (io, socket) => {

  // ─── Room ───────────────────────────────────────────
  socket.on('join:stream', ({ streamId }) => {
    socket.join(streamId);
    socket.data.streamId = streamId;

    // Tell this viewer if there's already a live streamer in the room
    if (streamers[streamId]) {
      socket.emit('streamer:present', { streamerId: streamers[streamId], username: streamers[streamId + ':username'] });
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
    streamers[streamId + ':username'] = socket.user.username;
    socket.data.isStreamer = true;
    socket.data.streamId   = streamId;
    socket.to(streamId).emit('streamer:present', { streamerId: socket.id, username: socket.user.username });
    console.log(`[webrtc] streamer ${socket.user.username} started stream ${streamId} (socket: ${socket.id})`);
  });

  // Viewer requests to connect → tell the streamer
  socket.on('webrtc:viewer-ready', ({ streamId }) => {
    const streamerId = streamers[streamId];
    console.log(`[webrtc] viewer-ready from ${socket.user.username} for stream ${streamId}, streamer: ${streamerId}`);
    if (!streamerId) {
      console.log(`[webrtc] No streamer found for stream ${streamId}`);
      return;
    }
    io.to(streamerId).emit('webrtc:viewer-ready', {
      viewerId:  socket.id,
      viewerName: socket.user.username,
    });
  });

  // Streamer sends offer to a specific viewer
  socket.on('webrtc:offer', ({ viewerId, offer }) => {
    console.log(`[webrtc] Forwarding offer from streamer to viewer ${viewerId}`);
    io.to(viewerId).emit('webrtc:offer', { streamerId: socket.id, offer });
  });

  // Viewer sends answer back to streamer
  socket.on('webrtc:answer', ({ streamerId, answer }) => {
    console.log(`[webrtc] Forwarding answer from viewer to streamer ${streamerId}`);
    io.to(streamerId).emit('webrtc:answer', { viewerId: socket.id, answer });
  });

  // ICE candidates (both directions)
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    // console.log(`[webrtc] Forwarding ICE to ${targetId}`);
    io.to(targetId).emit('webrtc:ice', { fromId: socket.id, candidate });
  });

  // Streamer ended
  socket.on('webrtc:stop', ({ streamId }) => {
    delete streamers[streamId];
    delete streamers[streamId + ':username'];
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
        streamService.endStream(streamId, socket.user.id)
          .then((stream) => {
            io.emit('stream:ended', stream);
            io.to(streamId).emit('chat:cleared', { streamId });
          })
          .catch((err) => {
            console.error('[stream cleanup] Failed to end stream on disconnect:', err?.message || err);
          });
      }
      const count = io.sockets.adapter.rooms.get(streamId)?.size || 0;
      io.to(streamId).emit('viewer:count', { count });
    }
  });
};
