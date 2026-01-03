import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/context/ToastContext';
import * as Linking from 'expo-linking';
import { parseDeepLink } from './src/utils/deepLink';
import useInviteStore from './src/store/inviteStore';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';

export default function App() {
  const [splashData, setSplashData] = useState(null);
  const setPendingInviteToken = useInviteStore(state => state.setPendingInviteToken);

  // Global deep link listener
  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDeepLink(url);
      if (parsed && parsed.screen === 'Invite' && parsed.params?.token) {
        setPendingInviteToken(parsed.params.token);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!splashData) {
    return (
      <AnimatedSplashScreen onFinish={(data) => setSplashData(data)} />
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppNavigator
          hasSeenOnboarding={splashData.hasSeenOnboarding}
          initialRoute={splashData.initialRoute}
          initialParams={splashData.initialParams}
        />
        <StatusBar style="light" />
      </ToastProvider>
    </ErrorBoundary>
  );
}
