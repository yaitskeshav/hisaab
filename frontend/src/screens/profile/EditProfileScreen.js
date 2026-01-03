import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import IconButton from '../../components/common/IconButton';
import CardGlass from '../../components/common/CardGlass';
import ActionSheet from '../../components/common/ActionSheet';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../context/ToastContext';
import { BASE_URL } from '../../api/client';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuthStore();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const getAvatarSource = () => {
    if (avatarUri) {
      return { uri: avatarUri };
    }
    if (user?.avatar_url) {
      return {
        uri: user.avatar_url.startsWith('http')
          ? user.avatar_url
          : `${BASE_URL}${user.avatar_url}`
      };
    }
    return null;
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await handleUploadAvatar(uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission required', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await handleUploadAvatar(uri);
    }
  };

  const handleUploadAvatar = async (uri) => {
    setUploadingAvatar(true);
    const result = await uploadAvatar(uri);
    setUploadingAvatar(false);

    if (result.success) {
      showToast('Photo updated', 'success');
    } else {
      showToast(result.error, 'error');
      setAvatarUri(null);
    }
  };

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    const result = await removeAvatar();
    setRemovingAvatar(false);

    if (result.success) {
      setAvatarUri(null);
      showToast('Photo removed', 'success');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setSaving(true);
    const result = await updateProfile(name.trim());
    setSaving(false);

    if (result.success) {
      showToast('Profile updated', 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } else {
      showToast(result.error, 'error');
    }
  };

  const avatarSource = getAvatarSource();

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          variant="glass"
        />
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Text style={styles.saveButtonText}>...</Text>
          ) : (
            <Ionicons name="checkmark" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setShowImagePicker(true)}
            disabled={uploadingAvatar || removingAvatar}
          >
            <View style={styles.avatarLarge}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.avatarImage}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={48} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              )}
              {(uploadingAvatar || removingAvatar) && (
                <View style={styles.avatarOverlay}>
                  <Text style={styles.uploadingText}>...</Text>
                </View>
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </TouchableOpacity>

          <CardGlass style={styles.card}>
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />

            <AppInput
              label="Email"
              value={email}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
            />

            <Text style={styles.note}>
              Note: Email cannot be changed. Contact support if needed.
            </Text>

            <AppButton
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={styles.saveButtonBottom}
            />
          </CardGlass>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={showImagePicker}
        title="Change Profile Photo"
        options={[
          { label: 'Take Photo', icon: 'camera-outline', onPress: handleTakePhoto },
          { label: 'Choose from Library', icon: 'image-outline', onPress: handlePickImage },
          ...(user?.avatar_url || avatarUri ? [{ label: 'Remove Photo', icon: 'trash-outline', onPress: handleRemoveAvatar, destructive: true }] : []),
        ]}
        onCancel={() => setShowImagePicker(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    top: 85,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  changePhotoText: {
    fontSize: 14,
    color: colors.primary,
  },
  card: {
    padding: spacing.lg,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  saveButtonBottom: {
    marginTop: spacing.md,
  },
});

export default EditProfileScreen;
