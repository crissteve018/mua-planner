import api from './events'; // re-use shared axios instance

// ─── Travel API ──────────────────────────────

export const getAllTravel = async (params = {}) => {
  const response = await api.get('/api/travel', { params });
  return response.data;
};

export const getTravelById = async (id) => {
  const response = await api.get(`/api/travel/${id}`);
  return response.data;
};

export const getTravelSummary = async (eventId) => {
  const response = await api.get(`/api/travel/summary/${eventId}`);
  return response.data;
};

export const createTravel = async (travelData) => {
  const response = await api.post('/api/travel', travelData);
  return response.data;
};

export const updateTravel = async (id, travelData) => {
  const response = await api.put(`/api/travel/${id}`, travelData);
  return response.data;
};

export const deleteTravel = async (id) => {
  const response = await api.delete(`/api/travel/${id}`);
  return response.data;
};
