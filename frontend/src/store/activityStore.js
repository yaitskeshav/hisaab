import { create } from 'zustand';
import apiClient from '../api/client';

const useActivityStore = create((set, get) => ({
  activities: [],
  isLoading: false,
  error: null,
  page: 1,
  total: 0,
  hasMore: true,

  // Fetch activities for all groups (with pagination)
  fetchActivities: async (page = 1, limit = 20, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      if (filters.groupId) params.append('group_id', filters.groupId);
      if (filters.type) params.append('type', filters.type);

      const { data } = await apiClient.get(`/activities?${params.toString()}`);

      const newActivities = data.activities || [];

      if (page === 1) {
        set({
          activities: newActivities,
          page: data.page,
          total: data.total,
          hasMore: newActivities.length >= limit,
          isLoading: false,
        });
      } else {
        set({
          activities: [...get().activities, ...newActivities],
          page: data.page,
          total: data.total,
          hasMore: newActivities.length >= limit,
          isLoading: false,
        });
      }
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch activities';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Fetch activities for a specific group
  fetchGroupActivities: async (groupId, page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get(`/activities/group/${groupId}?page=${page}&limit=${limit}`);

      const newActivities = data.activities || [];

      if (page === 1) {
        set({
          activities: newActivities,
          page: data.page,
          total: data.total,
          hasMore: newActivities.length >= limit,
          isLoading: false,
        });
      } else {
        set({
          activities: [...get().activities, ...newActivities],
          page: data.page,
          total: data.total,
          hasMore: newActivities.length >= limit,
          isLoading: false,
        });
      }
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch group activities';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Load more activities
  loadMore: async (filters = {}) => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;

    if (filters.groupId) {
      return get().fetchGroupActivities(filters.groupId, page + 1);
    }
    return get().fetchActivities(page + 1, 20, filters);
  },

  // Reset activities
  resetActivities: () => {
    set({
      activities: [],
      page: 1,
      total: 0,
      hasMore: true,
      error: null,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useActivityStore;
