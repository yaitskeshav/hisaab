import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { parseDeepLink } from '../utils/deepLink';
import useAuthStore from '../store/authStore';
import storage from '../utils/storage';

// Keep the native splash screen visible until we are ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Splash duration in milliseconds (time to show GIF before transitioning)
const SPLASH_DURATION = 2000; // 2 seconds

// Background color - should match your GIF background exactly
const SPLASH_BG_COLOR = '#1a1f25';

const { width, height } = Dimensions.get('window');

const AnimatedSplashScreen = ({ onFinish }) => {
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [isMinTimeElapsed, setMinTimeElapsed] = useState(false);
  const [appData, setAppData] = useState(null);
  const { restoreSession } = useAuthStore();

  // Load all required data
  useEffect(() => {
    async function loadData() {
      try {
        const [onboardingComplete, hasUserData, initialUrl] = await Promise.all([
          storage.getItem('onboarding_complete'),
          storage.getItem('user'),
          Linking.getInitialURL(),
        ]);

        // Determine onboarding status
        let hasSeenOnboarding = onboardingComplete === 'true';
        if (hasUserData && !hasSeenOnboarding) {
          await storage.setItem('onboarding_complete', 'true');
          hasSeenOnboarding = true;
        }

        // Parse deep link if present
        let initialRoute = null;
        let initialParams = null;
        if (initialUrl) {
          const parsed = parseDeepLink(initialUrl);
          if (parsed) {
            // Handle VerifyEmail deep link - call API directly
            if (parsed.screen === 'VerifyEmail' && parsed.params?.token) {
              try {
                const { verifyEmail } = useAuthStore.getState();
                await verifyEmail(parsed.params.token);
                // User will be authenticated after this, normal flow continues
              } catch (e) {
                console.log('Email verification failed:', e);
              }
            } else {
              initialRoute = parsed.screen;
              initialParams = parsed.params;
            }
          }
        }

        // Restore auth session (will use tokens if verify succeeded)
        await restoreSession();

        // Store loaded data
        setAppData({
          hasSeenOnboarding,
          initialRoute,
          initialParams,
        });

        setDataLoaded(true);
      } catch (e) {
        setAppData({
          hasSeenOnboarding: false,
          initialRoute: null,
          initialParams: null,
        });
        setDataLoaded(true);
      }
    }

    loadData();
  }, []);

  // Hide native splash and start timer
  useEffect(() => {
    SplashScreen.hideAsync();

    // Minimum display time for splash
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // Finish when both minimum time elapsed and data loading is complete
  useEffect(() => {
    if (isMinTimeElapsed && isDataLoaded && appData) {
      onFinish(appData);
    }
  }, [isMinTimeElapsed, isDataLoaded, appData]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/hisaab_splash.gif')}
        style={styles.gif}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BG_COLOR,
  },
  gif: {
    width: width,
    height: height,
  },
});

export default AnimatedSplashScreen;
