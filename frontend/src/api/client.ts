import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Admin token is stored in localStorage for this demo
export const getAdminToken = () => localStorage.getItem('admin_token');
export const setAdminToken = (token: string) => localStorage.setItem('admin_token', token);

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && (config.url?.includes('/admin') || config.method !== 'get')) {
    config.headers['x-admin-token'] = token;
  }
  return config;
});

export default api;
