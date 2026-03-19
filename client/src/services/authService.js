import api from './api';
export const register = (d) => api.post('/auth/register', d);
export const login    = (d) => api.post('/auth/login', d);
export const getMe    = ()  => api.get('/auth/me');
