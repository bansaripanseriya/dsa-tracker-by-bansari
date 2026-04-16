import axios from 'axios';

function getApiBaseUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredBase) return '/api';

  const normalized = configuredBase.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
