import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Check if updates are available in this build
const isUpdatesAvailable = () => {
  try {
    return (
      !__DEV__ &&
      typeof Updates.checkForUpdateAsync === 'function' &&
      typeof Updates.addListener === 'function'
    );
  } catch {
    return false;
  }
};

/**
 * Hook to handle OTA updates via EAS Update
 * - Listens for background update downloads
 * - Checks for updates when app comes to foreground
 * - Shows notification only once per downloaded update
 * - Only runs in production builds with updates enabled
 */
const useOTAUpdates = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const lastUpdateId = useRef(null);
  const appState = useRef(AppState.currentState);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if (!isUpdatesAvailable()) return;

    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        const result = await Updates.fetchUpdateAsync();

        if (result.isNew && result.manifest?.id !== lastUpdateId.current) {
          lastUpdateId.current = result.manifest?.id;
          setUpdateAvailable(true);
        }
      }
    } catch (error) {
      console.log('OTA update check failed:', error.message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Reload the app to apply update
  const reloadApp = useCallback(async () => {
    if (typeof Updates.reloadAsync !== 'function') return;
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
    if (!isUpdatesAvailable()) return;

    let subscription;
    try {
      subscription = Updates.addListener((event) => {
        if (
          Updates.UpdateEventType &&
          event.type === Updates.UpdateEventType.UPDATE_AVAILABLE
        ) {
          const updateId = event.manifest?.id;
          if (updateId !== lastUpdateId.current) {
            lastUpdateId.current = updateId;
            setUpdateAvailable(true);
          }
        }
      });
    } catch (error) {
      console.log('Failed to add updates listener:', error.message);
      return;
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  // Check for updates when app comes to foreground
  useEffect(() => {
    if (!isUpdatesAvailable()) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkForUpdates();
      }
      appState.current = nextAppState;
    });

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
