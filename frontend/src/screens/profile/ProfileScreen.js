import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import useAuthStore from '../../store/authStore';
import { BASE_URL } from '../../api/client';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@digitalhisaab.tech';

const ProfileScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const { user, logout } = useAuthStore();
  const [showFullImage, setShowFullImage] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const getAvatarUri = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${BASE_URL}${user.avatar_url}`;
  };

  const avatarUri = getAvatarUri();

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarLarge}
            onPress={() => avatarUri && setShowFullImage(true)}
            activeOpacity={avatarUri ? 0.7 : 1}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder, { backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }]}>
                <Ionicons name="person" size={44} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || ''}</Text>
        </View>

        {/* Settings */}
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Settings</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Appearance')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Appearance</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </CardGlass>

        {/* About */}
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>About</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Hisaab Support Request`)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </CardGlass>

        <AppButton
          title="Logout"
          onPress={() => setShowLogoutModal(true)}
          variant="outline"
          style={styles.logoutButton}
        />

        <Text style={[styles.version, { color: colors.textMuted }]}>Version {Constants.expoConfig?.version || '1.0.0'}</Text>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <TouchableOpacity
          style={styles.fullImageOverlay}
          activeOpacity={1}
          onPress={() => setShowFullImage(false)}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFullImage(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {avatarUri && (
            <Image
              source={{ uri: avatarUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        type="danger"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
  divider: {
    height: 1,
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: spacing.xl,
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullImage: {
    width: screenWidth - 40,
    height: screenWidth - 40,
    borderRadius: 20,
  },
});

export default ProfileScreen;
