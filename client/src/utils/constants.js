// Dynamic host detection - automatically uses the browser's current hostname/IP
const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

// Auto-detect backend URL based on current browser location
// Works with localhost, local IP (192.168.x.x), or any network IP
export const API_BASE = `${browserProtocol}//${browserHost}:5000/api`;
export const SOCKET_URL = `${browserProtocol}//${browserHost}:5000`;

export const CATEGORIES        = ['Gaming','Music','Art','Tech','IRL','Sports','Education','General'];
export const STREAM_CATEGORIES = CATEGORIES;
