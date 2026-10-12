import axios from 'axios';

// All requests go to /api (proxied to the backend in development).
const api = axios.create({ baseURL: '/api' });

// Attach the JWT, if any, to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turn any failure into a safe, human-readable message. Server messages are
// already generic (no stack traces), so they can be shown directly.
export function errorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Is the backend running?';
  const first = err.response.data?.errors?.[0]?.message;
  return first || err.response.data?.message || `Request failed (${err.response.status})`;
}

export const isUnauthorised = (err) => err.response?.status === 401;

export default api;
