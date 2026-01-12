import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Hook to handle OTA updates via EAS Update
 * - Listens for background update downloads
 * - Checks for updates when app comes to foreground
 * - Shows notification only once per downloaded update
 * - Only runs in production builds
 */
const useOTAUpdates = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const lastUpdateId = useRef(null);
  const appState = useRef(AppState.currentState);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    // Skip in dev mode
    if (__DEV__) return;

    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        // Download the update
        const result = await Updates.fetchUpdateAsync();

        // Only show notification if this is a new update
        if (result.isNew && result.manifest?.id !== lastUpdateId.current) {
          lastUpdateId.current = result.manifest?.id;
          setUpdateAvailable(true);
        }
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.log('OTA update check failed:', error.message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Reload the app to apply update
  const reloadApp = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log('Failed to reload app:', error.message);
    }
  }, []);

  // Dismiss the update notification
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  // Listen for updates downloaded in background
  useEffect(() => {
    // Skip in dev mode
    if (__DEV__) return;

    const subscription = Updates.addListener((event) => {
      if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
        // Only show if not already shown for this update
        const updateId = event.manifest?.id;
        if (updateId !== lastUpdateId.current) {
          lastUpdateId.current = updateId;
          setUpdateAvailable(true);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  // Check for updates when app comes to foreground
  useEffect(() => {
    // Skip in dev mode
    if (__DEV__) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App came to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkForUpdates();
      }
      appState.current = nextAppState;
    });

    // Also check on initial mount
    checkForUpdates();

    return () => subscription.remove();
  }, [checkForUpdates]);

  return {
    updateAvailable,
    isChecking,
    reloadApp,
    dismissUpdate,
    checkForUpdates,
  };
};

export default useOTAUpdates;
