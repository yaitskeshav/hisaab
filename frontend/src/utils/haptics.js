import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import useThemeStore from '../store/themeStore';

/**
 * Haptic feedback utility that respects user preferences
 * Haptics only work on physical iOS/Android devices, not simulators/emulators
 */

const canVibrate = Platform.OS === 'ios' || Platform.OS === 'android';

// Light haptic - for selections, toggles
export const hapticLight = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Only log once per session to avoid spam
      if (!global.__hapticErrorLogged) {
        global.__hapticErrorLogged = true;
        console.log('Haptic feedback error:', e.message || e);
      }
    }
  }
};

// Medium haptic - for button presses, confirmations
export const hapticMedium = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Heavy haptic - for significant actions
export const hapticHeavy = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Success haptic - for successful operations
export const hapticSuccess = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Warning haptic - for warnings
export const hapticWarning = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Error haptic - for errors
export const hapticError = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Selection haptic - for picker/selection changes
export const hapticSelection = async () => {
  if (!canVibrate) return;
  const { hapticsEnabled } = useThemeStore.getState();
  if (hapticsEnabled) {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }
};

// Force haptic - ignores user preference (use for haptics toggle demo)
export const hapticForce = async (type = 'medium') => {
  if (!canVibrate) {
    console.log('Haptics: Platform not supported');
    return false;
  }
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    return true;
  } catch (e) {
    console.log('Haptic error:', e.message || e);
    return false;
  }
};
