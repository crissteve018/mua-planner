import api from './events';

export const getDashboard = async () => {
  const response = await api.get('/api/dashboard');
  return response.data;
};
