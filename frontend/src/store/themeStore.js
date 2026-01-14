import { create } from 'zustand';
import storage from '../utils/storage';

// Accent color presets
export const ACCENT_COLORS = {
  blue: {
    id: 'blue',
    name: 'Blue',
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    primary: '#14B8A6',
    primaryLight: '#2DD4BF',
    primaryDark: '#0D9488',
  },
  green: {
    id: 'green',
    name: 'Green',
    primary: '#22C55E',
    primaryLight: '#4ADE80',
    primaryDark: '#16A34A',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    primary: '#F97316',
    primaryLight: '#FB923C',
    primaryDark: '#EA580C',
  },
  pink: {
    id: 'pink',
    name: 'Pink',
    primary: '#EC4899',
    primaryLight: '#F472B6',
    primaryDark: '#DB2777',
  },
};

const STORAGE_KEY_ACCENT = 'accent_color';
const STORAGE_KEY_HAPTICS = 'haptics_enabled';

const useThemeStore = create((set, get) => ({
  // State
  accentColorId: 'blue',
  hapticsEnabled: true,
  isLoaded: false,

  // Get current accent color object (for use outside components or with getState())
  getAccentColor: () => {
    const { accentColorId } = get();
    return ACCENT_COLORS[accentColorId] || ACCENT_COLORS.blue;
  },

  // Set accent color
  setAccentColor: async (colorId) => {
    if (!ACCENT_COLORS[colorId]) return;
    set({ accentColorId: colorId });
    await storage.setItem(STORAGE_KEY_ACCENT, colorId);
  },

  // Toggle haptics
  setHapticsEnabled: async (enabled) => {
    set({ hapticsEnabled: enabled });
    await storage.setItem(STORAGE_KEY_HAPTICS, JSON.stringify(enabled));
  },

  // Load preferences from storage
  loadPreferences: async () => {
    try {
      const [accentColor, hapticsStr] = await Promise.all([
        storage.getItem(STORAGE_KEY_ACCENT),
        storage.getItem(STORAGE_KEY_HAPTICS),
      ]);

      const updates = { isLoaded: true };

      if (accentColor && ACCENT_COLORS[accentColor]) {
        updates.accentColorId = accentColor;
      }

      if (hapticsStr !== null) {
        updates.hapticsEnabled = JSON.parse(hapticsStr);
      }

      set(updates);
    } catch (error) {
      console.log('Failed to load theme preferences:', error);
      set({ isLoaded: true });
    }
  },
}));

// Selector hook that properly subscribes to accent color changes
// Use this instead of getAccentColor for reactive updates
export const useAccentColor = () => {
  const accentColorId = useThemeStore((state) => state.accentColorId);
  return ACCENT_COLORS[accentColorId] || ACCENT_COLORS.blue;
};

export default useThemeStore;
