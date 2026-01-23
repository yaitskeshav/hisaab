import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { PREDEFINED_GROUP_ICONS } from '../../constants/groupIcons';
import { useAccentColor } from '../../store/themeStore';
import { BASE_URL } from '../../api/client';

const GroupIconPicker = ({
  visible,
  onClose,
  currentIcon,
  currentIconType,
  onSelectPredefined,
  onSelectCustom,
  onRemove,
  isLoading,
}) => {
  const accent = useAccentColor();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access gallery is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      onSelectCustom(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access camera is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      onSelectCustom(result.assets[0].uri);
    }
  };

  const renderCurrentIcon = () => {
    if (currentIconType === 'custom' && currentIcon) {
      const imageUri = currentIcon.startsWith('http') ? currentIcon : `${BASE_URL}${currentIcon}`;
      return (
        <Image
          source={{ uri: imageUri }}
          style={styles.currentIconImage}
        />
      );
    }
    if (currentIconType === 'predefined' && currentIcon) {
      const icon = PREDEFINED_GROUP_ICONS.find(i => i.id === currentIcon);
      return <Text style={styles.currentIconEmoji}>{icon?.emoji || '👥'}</Text>;
    }
    return <Text style={styles.currentIconEmoji}>👥</Text>;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Group Icon</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={accent.primary} />
                  <Text style={styles.loadingText}>Updating...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Current Icon Preview */}
                  <View style={styles.previewContainer}>
                    <View style={[styles.previewIcon, { borderColor: accent.primary }]}>
                      {renderCurrentIcon()}
                    </View>
                    {(currentIcon || currentIconType) && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={onRemove}
                        disabled={isLoading}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Custom Photo Options */}
                  <View style={styles.customSection}>
                    <Text style={styles.sectionTitle}>Use Custom Photo</Text>
                    <View style={styles.customButtons}>
                      <TouchableOpacity
                        style={[styles.customButton, { borderColor: accent.primary }]}
                        onPress={handlePickImage}
                      >
                        <Ionicons name="images-outline" size={24} color={accent.primary} />
                        <Text style={styles.customButtonText}>Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.customButton, { borderColor: accent.primary }]}
                        onPress={handleTakePhoto}
                      >
                        <Ionicons name="camera-outline" size={24} color={accent.primary} />
                        <Text style={styles.customButtonText}>Camera</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Predefined Icons */}
                  <View style={styles.iconsSection}>
                    <Text style={styles.sectionTitle}>Choose an Icon</Text>
                    <View style={styles.iconsGrid}>
                      {PREDEFINED_GROUP_ICONS.map(icon => (
                        <TouchableOpacity
                          key={icon.id}
                          style={[
                            styles.iconItem,
                            currentIconType === 'predefined' && currentIcon === icon.id && [
                              styles.iconItemSelected,
                              { borderColor: accent.primary, backgroundColor: accent.primary + '20' }
                            ]
                          ]}
                          onPress={() => onSelectPredefined(icon.id)}
                        >
                          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                          <Text style={styles.iconLabel}>{icon.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 400,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl + 20,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  previewIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  currentIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  currentIconEmoji: {
    fontSize: 40,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  removeText: {
    fontSize: 14,
    color: colors.error,
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  customSection: {
    marginBottom: spacing.lg,
  },
  customButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  customButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  customButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  iconsSection: {
    flex: 1,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  iconItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconItemSelected: {
    borderWidth: 2,
  },
  iconEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  iconLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default GroupIconPicker;
