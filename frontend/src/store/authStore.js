import { create } from 'zustand';
import apiClient from '../api/client';
import storage from '../utils/storage';
import useInviteStore from './inviteStore';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  isLoading: false,
  isRestoring: true,
  error: null,

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await storage.setItem('access_token', data.access_token);
      await storage.setItem('refresh_token', data.refresh_token);
      await storage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorCode = error.response?.data?.error;
      const errorEmail = error.response?.data?.email;
      // Handle email not verified case
      if (errorCode === 'email_not_verified' && errorEmail) {
        set({ isLoading: false });
        return { success: false, needsVerification: true, email: errorEmail };
      }
      const message = error.response?.data?.message || error.response?.data?.error || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Register
  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/signup', { name, email, password });
      // New signup returns message + email, needs verification
      set({ isLoading: false });
      return { success: true, needsVerification: true, email: data.email };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Google OAuth
  googleLogin: async (googleToken) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/google', { token: googleToken });
      await storage.setItem('access_token', data.access_token);
      await storage.setItem('refresh_token', data.refresh_token);
      await storage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Google login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Forgot Password
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset link';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Reset Password
  resetPassword: async (token, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/reset-password', { token, password: newPassword });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reset password';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Verify Email
  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/verify-email', { token });
      await storage.setItem('access_token', data.access_token);
      await storage.setItem('refresh_token', data.refresh_token);
      await storage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Email verification failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Resend Verification Email
  resendVerification: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/resend-verification', { email });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to resend verification';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Logout
  logout: async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await storage.removeItem('user');
    useInviteStore.getState().clearPendingInviteToken();
    set({ user: null, isAuthenticated: false, error: null });
  },

  // Restore session
  restoreSession: async () => {
    // We don't set global isLoading here anymore to avoid conflicting with AppNavigator loader
    // isRestoring is already true by default
    try {
      const token = await storage.getItem('access_token');
      if (token) {
        // First try to get user from storage
        const storedUser = await storage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          set({ user, isAuthenticated: true });
        }

        // Then fetch fresh user data from API
        try {
          const { data } = await apiClient.get('/me');
          await storage.setItem('user', JSON.stringify(data));
          set({ user: data, isAuthenticated: true, isRestoring: false });
        } catch (err) {
          // If API call fails but we have stored user, keep using it
          if (!storedUser) {
            throw err;
          }
          // If API failed but we have stored user, we are still authenticated
          set({ isRestoring: false });
        }
      } else {
        set({ isRestoring: false });
      }
    } catch (error) {
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      await storage.removeItem('user');
      set({ isRestoring: false });
    }
  },

  // Update profile (doesn't set global isLoading to avoid navigation reset)
  updateProfile: async (name) => {
    set({ error: null });
    try {
      const { data } = await apiClient.put('/profile', { name });
      await storage.setItem('user', JSON.stringify(data));
      set({ user: data });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update profile';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Upload avatar (doesn't set global isLoading to avoid navigation reset)
  uploadAvatar: async (imageUri) => {
    set({ error: null });
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri: imageUri,
        name: filename,
        type,
      });

      const { data } = await apiClient.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await storage.setItem('user', JSON.stringify(data));
      set({ user: data });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to upload avatar';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Remove avatar
  removeAvatar: async () => {
    set({ error: null });
    try {
      const { data } = await apiClient.delete('/profile/avatar');
      await storage.setItem('user', JSON.stringify(data));
      set({ user: data });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to remove avatar';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
