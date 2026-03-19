import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
};

export const getSocket       = () => socket;
export const disconnectSocket = () => { if (socket) { socket.disconnect(); socket = null; } };

// ─── Room ────────────────────────────────────────────
export const joinStream  = (streamId) => socket?.emit('join:stream',  { streamId });
export const leaveStream = (streamId) => socket?.emit('leave:stream', { streamId });

// ─── Chat ─────────────────────────────────────────────
export const sendMessage   = (streamId, content) => socket?.emit('chat:message', { streamId, content });
export const onMessage     = (cb) => socket?.on('chat:message', cb);
export const offMessage    = ()   => socket?.off('chat:message');
export const onUserJoined  = (cb) => socket?.on('user:joined', cb);
export const onViewerCount = (cb) => socket?.on('viewer:count', cb);

// ─── WebRTC (used directly in VideoPlayer via getSocket()) ──
// Events emitted/received by VideoPlayer.js:
//   emit: webrtc:start, webrtc:stop, webrtc:viewer-ready
//         webrtc:offer, webrtc:answer, webrtc:ice
//   on:   streamer:present, streamer:ended, webrtc:viewer-ready
//         webrtc:offer, webrtc:answer, webrtc:ice, viewer:count
