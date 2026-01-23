import { create } from 'zustand';
import apiClient from '../api/client';

const useGroupStore = create((set, get) => ({
  groups: [],
  currentGroup: null,
  isLoading: false,
  error: null,

  // Fetch all groups
  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get('/groups');
      set({ groups: data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch groups';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Create group
  createGroup: async (name, description) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/groups', { name, description });
      const groups = [...get().groups, data];
      set({ groups, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create group';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Get group details
  fetchGroupDetails: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get(`/groups/${groupId}`);
      set({ currentGroup: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch group details';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Join group by code
  joinGroup: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post(`/groups/join/${code}`);
      const groups = [...get().groups, data];
      set({ groups, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to join group';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Update group
  updateGroup: async (groupId, name, description) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.put(`/groups/${groupId}`, { name, description });
      const groups = get().groups.map(g => g.id === groupId ? data : g);
      set({ groups, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update group';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Check if user can leave a group
  checkCanLeave: async (groupId) => {
    try {
      const { data } = await apiClient.get(`/groups/${groupId}/can-leave`);
      return {
        success: true,
        canLeave: data.can_leave,
        pendingCount: data.pending_count || 0,
        balance: data.balance || 0,
        blockReason: data.block_reason || '',
        isLastMember: data.is_last_member,
        willDelete: data.will_delete,
      };
    } catch (error) {
      return { success: false, canLeave: false, pendingCount: 0, balance: 0, blockReason: 'error' };
    }
  },

  // Leave group
  leaveGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post(`/groups/${groupId}/leave`);
      const groups = get().groups.filter(g => g.id !== groupId);
      set({ groups, currentGroup: null, isLoading: false });
      return { success: true, deleted: data.deleted };
    } catch (error) {
      const errorData = error.response?.data;
      const isPendingError = errorData?.error === 'pending_settlements';
      const message = errorData?.message || 'Failed to leave group';
      set({ error: message, isLoading: false });
      return {
        success: false,
        error: message,
        isPendingSettlements: isPendingError,
        pendingCount: errorData?.pending_count || 0,
      };
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/groups/${groupId}`);
      const groups = get().groups.filter(g => g.id !== groupId);
      set({ groups, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete group';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Update group icon (predefined)
  updateGroupIcon: async (groupId, predefinedIcon) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('icon_type', 'predefined');
      formData.append('predefined_icon', predefinedIcon);

      const { data } = await apiClient.put(`/groups/${groupId}/icon`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const groups = get().groups.map(g => g.id === groupId ? data : g);
      set({ groups, currentGroup: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update group icon';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Upload custom group icon
  uploadGroupIcon: async (groupId, imageUri) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('icon_type', 'custom');

      // Get file extension
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('icon', {
        uri: imageUri,
        name: `group_icon.${fileType}`,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
      });

      const { data } = await apiClient.put(`/groups/${groupId}/icon`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const groups = get().groups.map(g => g.id === groupId ? data : g);
      set({ groups, currentGroup: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to upload group icon';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Remove group icon
  removeGroupIcon: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.delete(`/groups/${groupId}/icon`);
      const groups = get().groups.map(g => g.id === groupId ? data : g);
      set({ groups, currentGroup: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to remove group icon';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useGroupStore;
