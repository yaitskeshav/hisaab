import React from 'react';
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
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';

const ActionSheet = ({
  visible,
  title,
  options = [],
  onCancel,
  cancelText = 'Cancel',
}) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.container}>
          <CardGlass style={styles.content}>
            {title ? (
              <Text style={[styles.title, { color: colors.textMuted, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>{title}</Text>
            ) : null}

            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                ]}
                onPress={() => {
                  onCancel();
                  option.onPress?.();
                }}
                activeOpacity={0.7}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={option.destructive ? staticColors.error : colors.textPrimary}
                    style={styles.optionIcon}
                  />
                ) : null}
                <Text style={[
                  styles.optionText,
                  { color: colors.textPrimary },
                  option.destructive && { color: staticColors.error },
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{cancelText}</Text>
            </TouchableOpacity>
          </CardGlass>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  content: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  optionFirst: {},
  optionLast: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    marginRight: spacing.sm,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '500',
  },
  optionTextDestructive: {
    color: staticColors.error,
  },
  cancelButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default ActionSheet;
