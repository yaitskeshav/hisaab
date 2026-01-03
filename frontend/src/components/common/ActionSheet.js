import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from './CardGlass';

const ActionSheet = ({
  visible,
  title,
  options = [],
  onCancel,
  cancelText = 'Cancel',
}) => {
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
              <Text style={styles.title}>{title}</Text>
            ) : null}

            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  index === 0 && styles.optionFirst,
                  index === options.length - 1 && styles.optionLast,
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
                    color={option.destructive ? (colors.error || '#ef4444') : colors.textPrimary}
                    style={styles.optionIcon}
                  />
                ) : null}
                <Text style={[
                  styles.optionText,
                  option.destructive && styles.optionTextDestructive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </CardGlass>

          <CardGlass style={styles.cancelContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
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
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    color: colors.textPrimary,
  },
  optionTextDestructive: {
    color: colors.error || '#ef4444',
  },
  cancelContainer: {
    marginTop: spacing.sm,
    borderRadius: 16,
  },
  cancelButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default ActionSheet;
