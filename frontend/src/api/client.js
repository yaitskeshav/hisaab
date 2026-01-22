import axios from 'axios';
import Constants from 'expo-constants';
import storage from '../utils/storage';

// Get API URL from expo config (set in app.config.js from env vars)
const getBaseUrl = () => {
  // First try expo config extra (works in all builds)
  const url = Constants.expoConfig?.extra?.apiUrl;

  if (url) {
    return url;
  }

  // Fallback for development
  return 'https://api.digitalhisaab.tech';
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api/v1`;

export { BASE_URL, API_URL };

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await storage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          await storage.setItem('access_token', data.access_token);
          await storage.setItem('refresh_token', data.refresh_token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        } catch (err) {
          // Handle failed refresh (e.g., logout user)
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
