import axios from 'axios';
import API_BASE_URL from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Set User ID for API requests ────────────
// This must be called when user logs in/restores session
export const setApiUserId = (userId) => {
  if (userId) {
    api.defaults.headers.common['X-User-Id'] = userId;
  } else {
    delete api.defaults.headers.common['X-User-Id'];
  }
};

// ─── Events API ──────────────────────────────

export const getAllEvents = async (params = {}) => {
  const response = await api.get('/api/events', { params });
  return response.data;
};

export const getEventById = async (id) => {
  const response = await api.get(`/api/events/${id}`);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await api.post('/api/events', eventData);
  return response.data;
};

export const updateEvent = async (id, eventData) => {
  const response = await api.put(`/api/events/${id}`, eventData);
  return response.data;
};

export const cancelEvent = async (id, cancelData) => {
  const response = await api.put(`/api/events/${id}/cancel`, cancelData);
  return response.data;
};

export const completeEvent = async (id) => {
  const response = await api.put(`/api/events/${id}/complete`);
  return response.data;
};

export const restoreEvent = async (id) => {
  const response = await api.put(`/api/events/${id}/restore`);
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await api.delete(`/api/events/${id}`);
  return response.data;
};

export const undoDeleteEvent = async (eventData) => {
  const response = await api.post('/api/events/restore', eventData);
  return response.data;
};

export default api;
