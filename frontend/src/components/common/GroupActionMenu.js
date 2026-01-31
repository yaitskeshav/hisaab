import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';

/**
 * Shared action menu for groups - used in GroupsScreen and GroupDetailScreen
 *
 * @param {boolean} visible - Modal visibility
 * @param {function} onClose - Close modal callback
 * @param {object} group - Group object
 * @param {object} actions - Action callbacks (onInvite, onEdit, onActivity, onAnalytics, onExport, onLeave, onDelete)
 * @param {string} context - 'list' or 'detail' to show/hide context-specific options
 */
const GroupActionMenu = ({
  visible,
  onClose,
  group,
  actions = {},
  context = 'detail', // 'list' or 'detail'
}) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const {
    onInvite,
    onEdit,
    onActivity,
    onAnalytics,
    onExport,
    onLeave,
    onDelete,
  } = actions;

  const menuItems = [
    // Invite - both contexts
    {
      key: 'invite',
      icon: 'person-add-outline',
      label: 'Invite Members',
      onPress: onInvite,
      show: !!onInvite,
    },
    // Edit - both contexts
    {
      key: 'edit',
      icon: 'create-outline',
      label: 'Edit Group',
      onPress: onEdit,
      show: !!onEdit,
    },
    // Activity - usually detail only
    {
      key: 'activity',
      icon: 'time-outline',
      label: 'Activity',
      onPress: onActivity,
      show: !!onActivity,
    },
    // Analytics - usually detail only
    {
      key: 'analytics',
      icon: 'analytics-outline',
      label: 'Analytics',
      onPress: onAnalytics,
      show: !!onAnalytics,
    },
    // Export - both contexts
    {
      key: 'export',
      icon: 'download-outline',
      label: 'Export Data',
      onPress: onExport,
      show: !!onExport,
    },
    // Leave - both contexts
    {
      key: 'leave',
      icon: 'exit-outline',
      label: 'Leave Group',
      onPress: onLeave,
      show: !!onLeave,
      danger: true,
    },
    // Delete - list context only typically
    {
      key: 'delete',
      icon: 'trash-outline',
      label: 'Delete Group',
      onPress: onDelete,
      show: !!onDelete,
      danger: true,
    },
  ].filter(item => item.show);

  const handleItemPress = (item) => {
    onClose();
    // Small delay to let modal close animation start
    setTimeout(() => {
      item.onPress?.();
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.menuContainer, { backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }]}>
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{group?.name}</Text>

          {menuItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  item.danger && styles.menuItemDanger,
                ]}
                onPress={() => handleItemPress(item)}
              >
                <View style={[
                  styles.menuIconContainer,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' },
                  item.danger && styles.menuIconDanger,
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.danger ? colors.error : colors.textPrimary}
                  />
                </View>
                <Text style={[
                  styles.menuText,
                  { color: colors.textPrimary },
                  item.danger && { color: colors.error },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  menuContainer: {
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuItemDanger: {},
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
  },
});

export default GroupActionMenu;
