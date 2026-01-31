import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import useAuthStore from '../store/authStore';
import useInviteStore from '../store/inviteStore';
import { useAccentColor } from '../store/themeStore';
import { useThemeColors } from '../hooks/useThemeColors';
import useNotifications from '../hooks/useNotifications';
import { parseDeepLink } from '../utils/deepLink';
import { hapticSelection } from '../utils/haptics';

// Auth screens
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

// Main screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import GroupsScreen from '../screens/groups/GroupsScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import PrivacyPolicyScreen from '../screens/profile/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/profile/TermsOfServiceScreen';
import AppearanceScreen from '../screens/profile/AppearanceScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import ActivityScreen from '../screens/activity/ActivityScreen';
import JoinInviteModal from '../components/JoinInviteModal';

// Settlement screens
import SettleUpScreen from '../screens/settlements/SettleUpScreen';
import SettlePaymentScreen from '../screens/settlements/SettlePaymentScreen';
import PendingSettlementsScreen from '../screens/settlements/PendingSettlementsScreen';

// Analytics
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab navigator for authenticated users
const MainTabs = () => {
  // Initialize notifications when user is authenticated
  useNotifications();

  // Get accent color for tab bar (reactive)
  const accent = useAccentColor();
  const colors = useThemeColors();

  const tabListeners = {
    tabPress: () => hapticSelection(),
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarActiveTintColor: accent.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        listeners={tabListeners}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        listeners={tabListeners}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileScreen}
        listeners={tabListeners}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = ({ hasSeenOnboarding, initialRoute, initialParams }) => {
  const { isAuthenticated } = useAuthStore();
  const navigationRef = useRef(null);
  const setPendingInviteToken = useInviteStore(state => state.setPendingInviteToken);

  // Handle initial deep link
  useEffect(() => {
    if (initialRoute === 'Invite' && initialParams?.token) {
      setPendingInviteToken(initialParams.token);
    }
  }, [initialRoute, initialParams]);

  // Handle deep links when app is already open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        if (parsed.screen === 'Invite') {
          if (isAuthenticated) {
            setPendingInviteToken(parsed.params.token);
          } else {
            setPendingInviteToken(parsed.params.token);
            navigationRef.current?.navigate('Login');
          }
        } else if (parsed.screen === 'VerifyEmail') {
          // Handled by App.js - don't navigate here
        } else if (navigationRef.current) {
          navigationRef.current.navigate(parsed.screen, parsed.params);
        }
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  // Build linking config
  const prefix = Linking.createURL('/');
  const linking = {
    prefixes: ['hisaab://', prefix],
    config: {
      screens: {
        ResetPassword: {
          path: 'reset-password',
          parse: {
            token: (token) => token,
          },
        },
        ForgotPassword: 'forgot-password',
        Login: 'login',
        // Note: 'invite/:token' is handled manually in parseDeepLink and useEffects
        // to avoid React Navigation trying to navigate to a screen that doesn't exist
      },
    },
  };

  // Determine initial route name
  const getInitialRouteName = () => {
    if (initialRoute === 'Invite') return isAuthenticated ? 'Main' : 'Login';
    if (initialRoute) return initialRoute;
    if (!hasSeenOnboarding) return 'Onboarding';
    return 'Login';
  };

  const pendingInviteToken = useInviteStore(state => state.pendingInviteToken);
  const clearPendingInviteToken = useInviteStore(state => state.clearPendingInviteToken);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={!isAuthenticated ? getInitialRouteName() : 'Main'}
      >
        {!isAuthenticated ? (
          <>
            {!hasSeenOnboarding && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              initialParams={initialRoute === 'ResetPassword' ? initialParams : undefined}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="Activity" component={ActivityScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="SettleUp" component={SettleUpScreen} />
            <Stack.Screen name="SettlePayment" component={SettlePaymentScreen} />
            <Stack.Screen name="PendingSettlements" component={PendingSettlementsScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </>
        )}
      </Stack.Navigator>
      {isAuthenticated && (
        <JoinInviteModal
          visible={!!pendingInviteToken}
          token={pendingInviteToken}
          onHide={clearPendingInviteToken}
          onJoined={(groupId) => {
            navigationRef.current?.navigate('GroupDetail', { groupId });
          }}
        />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
