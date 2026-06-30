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

export const updateProfile = async (data) => {
  const response = await api.put('/api/auth/profile', data);
  return response.data;
};

export const sendPhoneOTP = async (phone) => {
  const response = await api.post('/api/auth/phone/send', { phone });
  return response.data;
};

export const verifyPhoneOTP = async (phone, code, name) => {
  const response = await api.post('/api/auth/phone/verify', { phone, code, name });
  return response.data;
};

export const registerUser = async (name, email, phone, password) => {
  const response = await api.post('/api/auth/register', { name, email, phone, password });
  return response.data;
};

export const verifyRegistration = async (name, email, phone, password, emailCode, phoneCode) => {
  const response = await api.post('/api/auth/register/verify', { name, email, phone, password, emailCode, phoneCode });
  return response.data;
};

export const loginWithPassword = async (email, password) => {
  const response = await api.post('/api/auth/login/password', { email, password });
  return response.data;
};
