import { create } from 'zustand';
import apiClient from '../api/client';

const useExpenseStore = create((set, get) => ({
  expenses: [],
  categories: [],
  isLoading: false,
  error: null,

  // Fetch categories
  fetchCategories: async () => {
    try {
      const { data } = await apiClient.get('/categories');
      set({ categories: data });
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  },

  // Fetch group expenses
  fetchGroupExpenses: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get(`/expenses/group/${groupId}`);
      set({ expenses: data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch expenses';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Create expense
  createExpense: async (expenseData, attachments = []) => {
    set({ isLoading: true, error: null });
    try {
      // Create expense first
      const { data: expense } = await apiClient.post('/expenses', expenseData);

      // Upload attachments with expense ID
      if (attachments.length > 0) {
        try {
          for (const file of attachments) {
            const formData = new FormData();
            formData.append('file', {
              uri: file.uri,
              type: file.type,
              name: file.name,
            });
            formData.append('expense_id', expense.id.toString());
            await apiClient.post('/attachments', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
          // Refetch expense to get attachments
          const { data: updatedExpense } = await apiClient.get(`/expenses/${expense.id}`);
          const expenses = [...get().expenses, updatedExpense];
          set({ expenses, isLoading: false });
          return { success: true, data: updatedExpense };
        } catch (attachmentError) {
          // Attachment failed - delete the expense
          await apiClient.delete(`/expenses/${expense.id}`);
          throw new Error('Failed to upload attachments');
        }
      }

      const expenses = [...get().expenses, expense];
      set({ expenses, isLoading: false });
      return { success: true, data: expense };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create expense';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Update expense
  updateExpense: async (expenseId, expenseData, attachments = []) => {
    set({ isLoading: true, error: null });
    try {
      // Update expense first
      const { data: expense } = await apiClient.put(`/expenses/${expenseId}`, expenseData);

      // Upload new attachments with expense ID
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            type: file.type,
            name: file.name,
          });
          formData.append('expense_id', expenseId.toString());
          await apiClient.post('/attachments', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        // Refetch expense to get updated attachments
        const { data: updatedExpense } = await apiClient.get(`/expenses/${expenseId}`);
        const expenses = get().expenses.map(e => e.id === expenseId ? updatedExpense : e);
        set({ expenses, isLoading: false });
        return { success: true, data: updatedExpense };
      }

      const expenses = get().expenses.map(e => e.id === expenseId ? expense : e);
      set({ expenses, isLoading: false });
      return { success: true, data: expense };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update expense';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Settle expense
  settleExpense: async (expenseId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.put(`/expenses/${expenseId}/settle`);
      const expenses = get().expenses.map(e =>
        e.id === expenseId ? data : e
      );
      set({ expenses, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to settle expense';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Delete expense
  deleteExpense: async (expenseId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/expenses/${expenseId}`);
      const expenses = get().expenses.filter(e => e.id !== expenseId);
      set({ expenses, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete expense';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useExpenseStore;
