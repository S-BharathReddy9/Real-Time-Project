import { useEffect, useRef } from 'react';
import { initSocket, disconnectSocket, getSocket } from '../services/socketService';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  useEffect(() => {
    if (!token) return;
    socketRef.current = initSocket(token);
    return () => disconnectSocket();
  }, [token]);
  return socketRef;
};
