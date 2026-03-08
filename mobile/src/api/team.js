import api from './events';

export const getTeamSummary = async (eventId) => {
  const response = await api.get(`/api/team/summary/${eventId}`);
  return response.data;
};
export const getTeamMemberById = async (id) => {
  const response = await api.get(`/api/team/${id}`);
  return response.data;
};
export const createTeamMember = async (data) => {
  const response = await api.post('/api/team', data);
  return response.data;
};
export const updateTeamMember = async (id, data) => {
  const response = await api.put(`/api/team/${id}`, data);
  return response.data;
};
export const deleteTeamMember = async (id) => {
  const response = await api.delete(`/api/team/${id}`);
  return response.data;
};
