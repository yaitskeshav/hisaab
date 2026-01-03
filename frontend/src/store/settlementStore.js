import { create } from 'zustand';
import apiClient from '../api/client';

const useSettlementStore = create((set, get) => ({
  balances: null,
  settlements: [],
  pendingSettlements: [],
  userTotalBalances: null, // { you_owe, owed_to_you, net_balance }
  isLoading: false,
  error: null,

  // Fetch user's total balances across all groups
  fetchUserTotalBalances: async () => {
    try {
      const { data } = await apiClient.get('/settlements/balances');
      set({ userTotalBalances: data });
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch user total balances', error);
      return { success: false };
    }
  },

  // Fetch group balances with optimized debts
  fetchGroupBalances: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get(`/groups/${groupId}/balances`);
      set({ balances: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch balances';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Fetch settlements for a group
  fetchGroupSettlements: async (groupId, status = '') => {
    set({ isLoading: true, error: null });
    try {
      const url = status
        ? `/settlements/group/${groupId}?status=${status}`
        : `/settlements/group/${groupId}`;
      const { data } = await apiClient.get(url);
      set({ settlements: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch settlements';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Fetch pending settlements for current user
  fetchPendingSettlements: async () => {
    try {
      const { data } = await apiClient.get('/settlements/pending');
      set({ pendingSettlements: data });
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch pending settlements', error);
      return { success: false };
    }
  },

  // Create a new settlement
  createSettlement: async (groupId, receiverId, amount, note = '') => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/settlements', {
        group_id: groupId,
        receiver_id: receiverId,
        amount: parseFloat(amount),
        note,
      });
      set({ isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create settlement';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Confirm a settlement (receiver action)
  confirmSettlement: async (settlementId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.put(`/settlements/${settlementId}/confirm`);
      // Remove from pending
      const pendingSettlements = get().pendingSettlements.filter(s => s.id !== settlementId);
      set({ pendingSettlements, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to confirm settlement';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Reject a settlement (receiver action)
  rejectSettlement: async (settlementId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.put(`/settlements/${settlementId}/reject`);
      // Remove from pending
      const pendingSettlements = get().pendingSettlements.filter(s => s.id !== settlementId);
      set({ pendingSettlements, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reject settlement';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Cancel a pending settlement (payer action)
  cancelSettlement: async (settlementId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/settlements/${settlementId}`);
      const settlements = get().settlements.filter(s => s.id !== settlementId);
      set({ settlements, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to cancel settlement';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  clearBalances: () => set({ balances: null }),
  clearError: () => set({ error: null }),
}));

export default useSettlementStore;
