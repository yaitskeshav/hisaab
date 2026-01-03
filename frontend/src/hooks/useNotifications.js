import { useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../store/authStore';
import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export const useNotifications = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuthStore();
  const initialized = useRef(false);

  // Early return for Expo Go - no notification support
  if (isExpoGo) {
    return {
      requestPermissions: () => Promise.resolve(null),
      getToken: () => null,
    };
  }

  // Lazy load notification service only when not in Expo Go
  const notificationService = require('../services/notificationService').default;

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback((response) => {
    try {
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) return;

      switch (data.type) {
        case 'member_added':
        case 'expense_added':
        case 'expense_edited':
          if (data.group_id) {
            navigation.navigate('GroupDetail', { groupId: parseInt(data.group_id) });
          }
          break;
        case 'settlement_created':
          navigation.navigate('PendingSettlements');
          break;
        case 'settlement_confirmed':
          if (data.group_id) {
            navigation.navigate('SettleUp', { groupId: parseInt(data.group_id) });
          }
          break;
        default:
          navigation.navigate('Dashboard');
      }
    } catch (e) {
      // Ignore navigation errors
    }
  }, [navigation]);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback((notification) => {
    // You can show an in-app toast or update UI here
    console.log('Foreground notification:', notification?.request?.content);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;

    const setupNotifications = async () => {
      try {
        // Initialize and get token
        const token = await notificationService.initialize();

        if (token) {
          // Save token to backend
          await notificationService.saveFCMToken(token);

          // Set up listeners
          notificationService.setupListeners(
            handleNotificationReceived,
            handleNotificationResponse
          );

          initialized.current = true;
        }
      } catch (e) {
        // Silently fail
        console.log('Notification setup skipped');
      }
    };

    setupNotifications();

    return () => {
      try {
        notificationService.removeListeners();
      } catch (e) {
        // Ignore
      }
    };
  }, [isAuthenticated, handleNotificationReceived, handleNotificationResponse]);

  return {
    requestPermissions: () => notificationService.initialize(),
    getToken: () => notificationService.getToken(),
  };
};

export default useNotifications;
