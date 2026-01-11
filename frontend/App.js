import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/context/ToastContext';
import * as Linking from 'expo-linking';
import { parseDeepLink } from './src/utils/deepLink';
import useInviteStore from './src/store/inviteStore';
import useAuthStore from './src/store/authStore';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import SuccessModal from './src/components/common/SuccessModal';

export default function App() {
  const [splashData, setSplashData] = useState(null);
  const [verifyModal, setVerifyModal] = useState({ visible: false, success: true, message: '' });
  const setPendingInviteToken = useInviteStore(state => state.setPendingInviteToken);
  const verifyEmail = useAuthStore(state => state.verifyEmail);
  const navigatorRef = useRef(null);

  // Global deep link listener
  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      const parsed = parseDeepLink(url);
      if (parsed && parsed.screen === 'Invite' && parsed.params?.token) {
        setPendingInviteToken(parsed.params.token);
      } else if (parsed && parsed.screen === 'VerifyEmail' && parsed.params?.token) {
        // Handle email verification
        const result = await verifyEmail(parsed.params.token);
        if (result.success) {
          setVerifyModal({
            visible: true,
            success: true,
            message: 'Your email has been verified successfully. You are now logged in.',
          });
        } else {
          setVerifyModal({
            visible: true,
            success: false,
            message: 'This verification link is invalid or has expired. Please request a new one.',
          });
        }
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
        <SuccessModal
          visible={verifyModal.visible}
          title={verifyModal.success ? 'Email Verified!' : 'Verification Failed'}
          message={verifyModal.message}
          buttonText={verifyModal.success ? 'Get Started' : 'OK'}
          type={verifyModal.success ? 'success' : 'error'}
          icon={verifyModal.success ? 'checkmark-circle' : 'close-circle'}
          onClose={() => setVerifyModal({ ...verifyModal, visible: false })}
        />
        <StatusBar style="light" />
      </ToastProvider>
    </ErrorBoundary>
  );
}
