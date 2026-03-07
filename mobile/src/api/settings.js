import axios from 'axios';
import API_BASE_URL from './config';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

export const getSettings = async () => {
  const { data } = await api.get('/api/settings');
  return data;
};

export const updateSettings = async (updates) => {
  const { data } = await api.put('/api/settings', updates);
  return data;
};

export const submitFeedback = async (feedback) => {
  const { data } = await api.post('/api/feedback', feedback);
  return data;
};

export const clearAllData = async () => {
  const { data } = await api.delete('/api/data/clear');
  return data;
};
