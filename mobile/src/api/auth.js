import api from './events';

export const signup = async (email, name) => {
  const response = await api.post('/api/auth/signup', { email, name });
  return response.data;
};

export const verifySignup = async (email, code) => {
  const response = await api.post('/api/auth/verify', { email, code });
  return response.data;
};

export const login = async (email) => {
  const response = await api.post('/api/auth/login', { email });
  return response.data;
};

export const verifyLogin = async (email, code) => {
  const response = await api.post('/api/auth/login/verify', { email, code });
  return response.data;
};

export const resendOTP = async (email, purpose) => {
  const response = await api.post('/api/auth/resend', { email, purpose });
  return response.data;
};

export const getProfile = async (email) => {
  const response = await api.get(`/api/auth/me/${encodeURIComponent(email)}`);
  return response.data;
};
