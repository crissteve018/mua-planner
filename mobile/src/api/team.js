import api from './events';

// ── Team Members (per event) ──
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

// ── Team Contacts (frequent members) ──
export const getTeamContacts = async () => {
  const response = await api.get('/api/team-contacts');
  return response.data;
};
export const createTeamContact = async (data) => {
  const response = await api.post('/api/team-contacts', data);
  return response.data;
};
export const updateTeamContact = async (id, data) => {
  const response = await api.put(`/api/team-contacts/${id}`, data);
  return response.data;
};
export const deleteTeamContact = async (id) => {
  const response = await api.delete(`/api/team-contacts/${id}`);
  return response.data;
};
