import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../api/client';

/**
 * Hook to check for app updates via backend API
 * Compares current app version with latest version from server
 */
const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  // Compare semantic versions (returns true if remote > current)
  const isNewerVersion = (current, remote) => {
    if (!remote) return false;

    const parseVersion = (v) => {
      const clean = String(v).replace(/^v/, '').split('-')[0];
      return clean.split('.').map(Number);
    };

    const currentParts = parseVersion(current);
    const remoteParts = parseVersion(remote);

    for (let i = 0; i < 3; i++) {
      const c = currentParts[i] || 0;
      const r = remoteParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  };

  // Check if current version is below minimum
  const isBelowMinVersion = (current, minVersion) => {
    if (!minVersion) return false;
    return isNewerVersion(current, minVersion);
  };

  // Check backend for updates
  const checkForUpdate = useCallback(async () => {
    // Only check on Android
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      setIsChecking(true);

      const response = await fetch(`${API_URL}/app/version?platform=android`);

      if (!response.ok) {
        console.log('Version check failed:', response.status);
        return;
      }

      const data = await response.json();

      const hasUpdate = isNewerVersion(currentVersion, data.version);
      const forceUpdate = data.force_update || isBelowMinVersion(currentVersion, data.min_version);

      if (hasUpdate) {
        setUpdateInfo({
          version: data.version,
          currentVersion,
          minVersion: data.min_version,
          releaseNotes: data.release_notes,
          downloadUrl: data.download_url,
          forceUpdate,
        });
      } else {
        setUpdateInfo(null);
      }
    } catch (error) {
      console.log('Update check failed:', error.message);
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion]);

  // Open download URL
  const downloadUpdate = useCallback(async () => {
    if (updateInfo?.downloadUrl) {
      await Linking.openURL(updateInfo.downloadUrl);
    }
  }, [updateInfo]);

  // Dismiss update notification (only if not forced)
  const dismissUpdate = useCallback(() => {
    if (!updateInfo?.forceUpdate) {
      setUpdateInfo(null);
    }
  }, [updateInfo]);

  // Check on mount
  useEffect(() => {
    checkForUpdate();
  }, []);

  return {
    updateInfo,
    isChecking,
    currentVersion,
    checkForUpdate,
    downloadUpdate,
    dismissUpdate,
  };
};

export default useAppUpdate;
