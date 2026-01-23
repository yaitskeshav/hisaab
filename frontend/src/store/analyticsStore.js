import { create } from 'zustand';
import apiClient from '../api/client';

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

const SECTIONS = ['overview', 'categories', 'members', 'trends', 'personal', 'settlements'];
const PERIODS = ['week', 'month', 'all'];

const useAnalyticsStore = create((set, get) => ({
  // Current selections
  selectedSection: 'overview',
  selectedPeriods: {
    overview: 'all',
    categories: 'all',
    members: 'all',
    trends: 'month',
    personal: 'all',
    settlements: 'all',
  },

  // Cached data per group -> section -> period
  cache: {},

  // Loading states per section
  loading: {
    overview: false,
    categories: false,
    members: false,
    trends: false,
    personal: false,
    settlements: false,
  },

  // Error states per section
  errors: {
    overview: null,
    categories: null,
    members: null,
    trends: null,
    personal: null,
    settlements: null,
  },

  // Set selected section
  setSection: (section) => {
    if (SECTIONS.includes(section)) {
      set({ selectedSection: section });
    }
  },

  // Set period for a specific section
  setPeriod: (section, period) => {
    if (SECTIONS.includes(section) && PERIODS.includes(period)) {
      set((state) => ({
        selectedPeriods: {
          ...state.selectedPeriods,
          [section]: period,
        },
      }));
    }
  },

  // Get cache key
  getCacheKey: (groupId, section, period) => `${groupId}-${section}-${period}`,

  // Check if cache is valid
  isCacheValid: (groupId, section, period) => {
    const key = get().getCacheKey(groupId, section, period);
    const cached = get().cache[key];
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  },

  // Get cached data
  getCachedData: (groupId, section, period) => {
    const key = get().getCacheKey(groupId, section, period);
    const cached = get().cache[key];
    return cached?.data || null;
  },

  // Fetch section data
  fetchSectionData: async (groupId, section, period, forceRefresh = false) => {
    const { isCacheValid, getCachedData, getCacheKey } = get();

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(groupId, section, period)) {
      return { success: true, data: getCachedData(groupId, section, period) };
    }

    // Set loading
    set((state) => ({
      loading: { ...state.loading, [section]: true },
      errors: { ...state.errors, [section]: null },
    }));

    try {
      const { data } = await apiClient.get(`/analytics/group/${groupId}`, {
        params: { section, period },
      });

      // Cache the data
      const key = getCacheKey(groupId, section, period);
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            data,
            timestamp: Date.now(),
          },
        },
        loading: { ...state.loading, [section]: false },
      }));

      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch analytics';
      set((state) => ({
        loading: { ...state.loading, [section]: false },
        errors: { ...state.errors, [section]: message },
      }));
      return { success: false, error: message };
    }
  },

  // Fetch current section with current period
  fetchCurrentSection: async (groupId, forceRefresh = false) => {
    const { selectedSection, selectedPeriods, fetchSectionData } = get();
    const period = selectedPeriods[selectedSection];
    return fetchSectionData(groupId, selectedSection, period, forceRefresh);
  },

  // Clear cache for a group (called on pull-to-refresh)
  clearGroupCache: (groupId) => {
    set((state) => {
      const newCache = { ...state.cache };
      Object.keys(newCache).forEach((key) => {
        if (key.startsWith(`${groupId}-`)) {
          delete newCache[key];
        }
      });
      return { cache: newCache };
    });
  },

  // Clear all cache
  clearAllCache: () => {
    set({ cache: {} });
  },

  // Reset store
  reset: () => {
    set({
      selectedSection: 'overview',
      selectedPeriods: {
        overview: 'all',
        categories: 'all',
        members: 'all',
        trends: 'month',
        personal: 'all',
        settlements: 'all',
      },
      cache: {},
      loading: {
        overview: false,
        categories: false,
        members: false,
        trends: false,
        personal: false,
        settlements: false,
      },
      errors: {
        overview: null,
        categories: null,
        members: null,
        trends: null,
        personal: null,
        settlements: null,
      },
    });
  },
}));

export const ANALYTICS_SECTIONS = SECTIONS;
export const ANALYTICS_PERIODS = PERIODS;
export default useAnalyticsStore;
