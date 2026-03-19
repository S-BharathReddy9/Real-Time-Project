import api from './api';
export const getLiveStreams = ()   => api.get('/streams');
export const getStream     = (id) => api.get(`/streams/${id}`);
export const createStream  = (d)  => api.post('/streams', d);
export const goLive        = (id) => api.patch(`/streams/${id}/live`);
export const endStream     = (id) => api.patch(`/streams/${id}/end`);
