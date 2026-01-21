import axios from 'axios';
import { Platform } from 'react-native';
import storage from '../utils/storage';

// For Android emulator use 10.0.2.2, for physical device use your computer's IP
// Web uses localhost, Android emulator uses 10.0.2.2 (maps to host localhost)
const getBaseUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL;

  if (!url) {
    url = Platform.OS === 'android' ? 'http://192.168.0.118:3000' : 'http://localhost:3000';
  }

  // Sanitize: Remove extra https:// if it was accidentally prepended to http://
  if (url.startsWith('https://http://')) {
    url = url.replace('https://http://', 'http://');
  }

  return url;
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api/v1`;

// Debug: log API URL on startup
console.log('[API Client] BASE_URL:', BASE_URL);
console.log('[API Client] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

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
