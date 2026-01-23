import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppButton from './AppButton';

const AppUpdateModal = ({
  visible,
  updateInfo,
  onUpdate,
  onDismiss,
}) => {
  if (!updateInfo) return null;

  const { version, currentVersion, releaseNotes, forceUpdate } = updateInfo;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="download-outline" size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          {/* Version info */}
          <Text style={styles.versionText}>
            v{currentVersion} → v{version}
          </Text>

          {/* Release notes */}
          {releaseNotes ? (
            <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesTitle}>What's New:</Text>
              <Text style={styles.notesText}>{releaseNotes}</Text>
            </ScrollView>
          ) : null}

          {/* Message */}
          <Text style={styles.message}>
            {forceUpdate
              ? 'This update is required to continue using the app. Please update now.'
              : 'A new version of Hisaab is available. Update now for the best experience.'}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <AppButton
              title="Update Now"
              onPress={onUpdate}
              style={styles.updateButton}
            />
            {!forceUpdate && (
              <TouchableOpacity onPress={onDismiss} style={styles.laterButton}>
                <Text style={styles.laterText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  versionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  notesContainer: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
  },
  updateButton: {
    marginBottom: spacing.sm,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  laterText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default AppUpdateModal;
