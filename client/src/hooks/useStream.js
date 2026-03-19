import { useContext } from 'react';
import { StreamContext } from '../context/StreamContext';
export const useStream = () => useContext(StreamContext);
