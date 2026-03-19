import React, { createContext, useState, useCallback } from 'react';
import { getLiveStreams, getStream } from '../services/streamService';

export const StreamContext = createContext(null);

export const StreamProvider = ({ children }) => {
  const [streams,       setStreams]       = useState([]);
  const [currentStream, setCurrentStream] = useState(null);
  const [loading,       setLoading]       = useState(false);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getLiveStreams();
      setStreams(data.streams);
    } finally { setLoading(false); }
  }, []);

  const fetchStream = useCallback(async (id) => {
    const { data } = await getStream(id);
    setCurrentStream(data.stream);
    return data.stream;
  }, []);

  return (
    <StreamContext.Provider value={{ streams, currentStream, loading, fetchStreams, fetchStream, setCurrentStream }}>
      {children}
    </StreamContext.Provider>
  );
};
