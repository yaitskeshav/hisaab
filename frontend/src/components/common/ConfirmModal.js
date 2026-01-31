import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from './CardGlass';
import { hapticWarning, hapticLight } from '../../utils/haptics';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'default', // 'default', 'danger', 'warning'
  icon,
}) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();

  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          iconName: 'trash-outline',
          iconColor: staticColors.error || '#ef4444',
          confirmBg: staticColors.error || '#ef4444',
        };
      case 'warning':
        return {
          iconName: 'warning-outline',
          iconColor: '#f59e0b',
          confirmBg: '#f59e0b',
        };
      default:
        return {
          iconName: 'help-circle-outline',
          iconColor: staticColors.primary,
          confirmBg: staticColors.primary,
        };
    }
  };

  const config = getTypeConfig();

  // Trigger warning haptic when danger/warning modal opens
  useEffect(() => {
    if (visible && (type === 'danger' || type === 'warning')) {
      hapticWarning();
    }
  }, [visible, type]);

  const handleCancel = async () => {
    await hapticLight();
    onCancel?.();
  };

  const handleConfirm = async () => {
    await hapticLight();
    onConfirm?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <CardGlass style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.iconColor}20` }]}>
            <Ionicons
              name={icon || config.iconName}
              size={32}
              color={config.iconColor}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

          {message ? (
            <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: config.confirmBg }]}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </CardGlass>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ConfirmModal;
