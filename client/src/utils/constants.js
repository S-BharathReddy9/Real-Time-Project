const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const isBrowserLocalhost = browserHost === 'localhost' || browserHost === '127.0.0.1';

const envApiBase = process.env.REACT_APP_API_URL;
const envSocketUrl = process.env.REACT_APP_SOCKET_URL;

const pointsToLocalhost = (value = '') => /localhost|127\.0\.0\.1/i.test(value);

export const API_BASE =
  envApiBase && !(pointsToLocalhost(envApiBase) && !isBrowserLocalhost)
    ? envApiBase
    : '/api';

export const SOCKET_URL =
  envSocketUrl && !(pointsToLocalhost(envSocketUrl) && !isBrowserLocalhost)
    ? envSocketUrl
    : `${browserProtocol}//${browserHost}:5000`;

export const CATEGORIES        = ['Gaming','Music','Art','Tech','IRL','Sports','Education','General'];
export const STREAM_CATEGORIES = CATEGORIES;
