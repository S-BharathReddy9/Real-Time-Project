import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) return socket;
  
  console.log('[Socket] Connecting to:', SOCKET_URL);
  
  socket = io(SOCKET_URL, {
    auth: { token },
    // Try WebSocket first, fall back to HTTP long-polling
    transports: ['websocket', 'polling'],
    // Reconnection settings
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected!', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
};

export const getSocket       = () => socket;
export const disconnectSocket = () => { if (socket) { socket.disconnect(); socket = null; } };

// ─── Room ────────────────────────────────────────────
export const joinStream  = (streamId) => {
  console.log('[Socket] Joining stream:', streamId);
  socket?.emit('join:stream',  { streamId });
};
export const leaveStream = (streamId) => socket?.emit('leave:stream', { streamId });

// ─── Chat ─────────────────────────────────────────────
export const sendMessage   = (streamId, content) => socket?.emit('chat:message', { streamId, content });
export const onMessage     = (cb) => socket?.on('chat:message', cb);
export const offMessage    = ()   => socket?.off('chat:message');
export const onChatCleared = (cb) => socket?.on('chat:cleared', cb);
export const offChatCleared = ()  => socket?.off('chat:cleared');
export const onUserJoined  = (cb) => socket?.on('user:joined', cb);
export const onViewerCount = (cb) => {
  if (!socket) return;
  socket.on('viewer:count', cb);
  return () => socket.off('viewer:count', cb);
};

// ─── WebRTC (used directly in VideoPlayer via getSocket()) ──
// Events emitted/received by VideoPlayer.js:
//   emit: webrtc:start, webrtc:stop, webrtc:viewer-ready
//         webrtc:offer, webrtc:answer, webrtc:ice
//   on:   streamer:present, streamer:ended, webrtc:viewer-ready
//         webrtc:offer, webrtc:answer, webrtc:ice, viewer:count
