import { Platform } from 'react-native';
import apiClient from '../api/client';

// Safe check for Expo Go
let isExpoGo = false;
try {
  const Constants = require('expo-constants').default;
  // Only Expo Go has appOwnership === 'expo'
  isExpoGo = Constants.appOwnership === 'expo';
  console.log('App ownership:', Constants.appOwnership, 'isExpoGo:', isExpoGo);
} catch (e) {
  console.log('Constants check error:', e.message);
  isExpoGo = false;
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.Notifications = null;
    this.Device = null;
    this.initialized = false;
  }

  // Initialize notifications and get FCM token
  async initialize() {
    console.log('NotificationService.initialize() called, isExpoGo:', isExpoGo);

    // Always skip in Expo Go
    if (isExpoGo) {
      console.log('Push notifications not available in Expo Go');
      return null;
    }

    if (this.initialized) {
      console.log('Already initialized, token:', this.expoPushToken);
      return this.expoPushToken;
    }

    try {
      console.log('Loading notification modules...');
      // Dynamic imports to avoid loading native modules in Expo Go
      const Notifications = require('expo-notifications');
      const Device = require('expo-device');

      this.Notifications = Notifications;
      this.Device = Device;
      console.log('Modules loaded, isDevice:', Device.isDevice);

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Check if physical device
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
      }

      // Request permissions
      console.log('Requesting permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing permission status:', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('Requesting new permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New permission status:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get push token - use projectId from app.json extra.eas
      const Constants = require('expo-constants').default;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_PROJECT_ID;
      console.log('Getting push token, projectId:', projectId);
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.expoPushToken = tokenData.data;
      console.log('Push token obtained:', this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      this.initialized = true;
      return this.expoPushToken;
    } catch (error) {
      // Silently fail - notifications just won't work
      console.log('Notifications unavailable:', error.message);
      return null;
    }
  }

  // Save FCM token to backend
  async saveFCMToken(token) {
    if (!token) return;

    try {
      await apiClient.put('/fcm-token', { fcm_token: token });
      console.log('FCM token saved to backend');
    } catch (error) {
      console.log('Error saving FCM token:', error.message);
    }
  }

  // Set up notification listeners
  setupListeners(onNotificationReceived, onNotificationResponse) {
    if (isExpoGo || !this.Notifications) return;

    try {
      this.notificationListener = this.Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        }
      );

      this.responseListener = this.Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification tapped:', response);
          if (onNotificationResponse) {
            onNotificationResponse(response);
          }
        }
      );
    } catch (e) {
      // Silently ignore
    }
  }

  // Remove listeners
  removeListeners() {
    if (isExpoGo || !this.Notifications) return;

    try {
      if (this.notificationListener) {
        this.Notifications.removeNotificationSubscription(this.notificationListener);
      }
      if (this.responseListener) {
        this.Notifications.removeNotificationSubscription(this.responseListener);
      }
    } catch (e) {
      // Silently ignore
    }
  }

  // Get the current push token
  getToken() {
    return this.expoPushToken;
  }

  // Schedule a local notification (for testing)
  async scheduleLocalNotification(title, body, data = {}) {
    if (isExpoGo || !this.Notifications) return;

    try {
      await this.Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: null,
      });
    } catch (e) {
      // Silently ignore
    }
  }
}

export default new NotificationService();
