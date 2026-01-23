import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import IconButton from '../../components/common/IconButton';
import Loader from '../../components/common/Loader';
import { useToast } from '../../context/ToastContext';
import ExportModal from '../../components/ExportModal';
import useGroupStore from '../../store/groupStore';
import { useAccentColor } from '../../store/themeStore';
import { formatCurrency } from '../../utils/currency';
import apiClient, { BASE_URL } from '../../api/client';
import InviteModal from '../../components/InviteModal';
import GroupIconPicker from '../../components/common/GroupIconPicker';
import { PREDEFINED_GROUP_ICONS } from '../../constants/groupIcons';

// Get the most recent activity date for a group (group update or expense activity)
const getGroupLastActivity = (group) => {
  const groupUpdated = new Date(group.updated_at || group.created_at || 0);

  // Find the most recent expense date
  let latestExpenseDate = new Date(0);
  if (group.expenses?.length > 0) {
    group.expenses.forEach(expense => {
      const expenseDate = new Date(expense.updated_at || expense.date || expense.created_at || 0);
      if (expenseDate > latestExpenseDate) {
        latestExpenseDate = expenseDate;
      }
    });
  }

  return groupUpdated > latestExpenseDate ? groupUpdated : latestExpenseDate;
};

const GroupsScreen = ({ navigation }) => {
  const { groups, isLoading, fetchGroups, createGroup, joinGroup, updateGroup, leaveGroup, deleteGroup, checkCanLeave, updateGroupIcon, uploadGroupIcon, removeGroupIcon } = useGroupStore();
  const { showToast } = useToast();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'leave' or 'delete'
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Leave group modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveCheckLoading, setLeaveCheckLoading] = useState(false);
  const [leaveInfo, setLeaveInfo] = useState({
    canLeave: true,
    pendingCount: 0,
    balance: 0,
    blockReason: '',
    willDelete: false
  });
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveModalAnim = useRef(new Animated.Value(0)).current;
  const leaveIconAnim = useRef(new Animated.Value(0)).current;

  // Icon picker state
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isIconUpdating, setIsIconUpdating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    await fetchGroups();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    const result = await createGroup(groupName, groupDescription);
    if (result.success) {
      showToast('Group created successfully', 'success');
      setCreateModalVisible(false);
      setGroupName('');
      setGroupDescription('');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setJoinError('Invite code is required');
      return;
    }

    setJoinError('');
    setJoinLoading(true);

    try {
      const { data } = await apiClient.post(`/groups/join/${joinCode}`);
      // Refresh groups list
      await fetchGroups();
      setJoinLoading(false);
      setJoinModalVisible(false);
      setJoinCode('');
      showToast('Joined group successfully', 'success');
    } catch (error) {
      setJoinLoading(false);
      const message = error.response?.data?.message || 'Invalid invite code';
      setJoinError(message);
    }
  };

  const handleShareInvite = (group) => {
    setSelectedGroup(group);
    setShareModalVisible(true);
  };

  const handleGroupActions = (group) => {
    setSelectedGroup(group);
    setActionModalVisible(true);
  };

  const handleEditGroup = () => {
    setGroupName(selectedGroup.name);
    setGroupDescription(selectedGroup.description || '');
    setActionModalVisible(false);
    setEditModalVisible(true);
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    const result = await updateGroup(selectedGroup.id, groupName, groupDescription);
    if (result.success) {
      showToast('Group updated successfully', 'success');
      setEditModalVisible(false);
      setGroupName('');
      setGroupDescription('');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleSelectPredefinedIcon = async (iconId) => {
    setIsIconUpdating(true);
    const result = await updateGroupIcon(selectedGroup.id, iconId);
    setIsIconUpdating(false);
    if (result.success) {
      // Update selectedGroup with new icon
      setSelectedGroup({ ...selectedGroup, icon_url: iconId, icon_type: 'predefined' });
      setShowIconPicker(false);
      showToast('Icon updated', 'success');
    } else {
      showToast(result.error || 'Failed to update icon', 'error');
    }
  };

  const handleSelectCustomIcon = async (imageUri) => {
    setIsIconUpdating(true);
    const result = await uploadGroupIcon(selectedGroup.id, imageUri);
    setIsIconUpdating(false);
    if (result.success) {
      // Update selectedGroup with new icon
      setSelectedGroup({ ...selectedGroup, icon_url: result.data.icon_url, icon_type: 'custom' });
      setShowIconPicker(false);
      showToast('Icon updated', 'success');
    } else {
      showToast(result.error || 'Failed to upload icon', 'error');
    }
  };

  const handleRemoveIcon = async () => {
    setIsIconUpdating(true);
    const result = await removeGroupIcon(selectedGroup.id);
    setIsIconUpdating(false);
    if (result.success) {
      // Update selectedGroup to remove icon
      setSelectedGroup({ ...selectedGroup, icon_url: '', icon_type: '' });
      setShowIconPicker(false);
      showToast('Icon removed', 'success');
    } else {
      showToast(result.error || 'Failed to remove icon', 'error');
    }
  };

  // Helper to render group icon
  const renderSelectedGroupIcon = (size = 56, fontSize = 28) => {
    if (selectedGroup?.icon_type === 'custom' && selectedGroup?.icon_url) {
      return (
        <Image
          source={{ uri: selectedGroup.icon_url.startsWith('http') ? selectedGroup.icon_url : `${BASE_URL}${selectedGroup.icon_url}` }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    if (selectedGroup?.icon_type === 'predefined' && selectedGroup?.icon_url) {
      const icon = PREDEFINED_GROUP_ICONS.find(i => i.id === selectedGroup.icon_url);
      return <Text style={{ fontSize }}>{icon?.emoji || '👥'}</Text>;
    }
    return <Text style={{ fontSize }}>{selectedGroup?.name?.charAt(0).toUpperCase() || 'G'}</Text>;
  };

  // Leave modal animation effect
  useEffect(() => {
    if (showLeaveModal) {
      Animated.parallel([
        Animated.spring(leaveModalAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(leaveIconAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      leaveModalAnim.setValue(0);
      leaveIconAnim.setValue(0);
    }
  }, [showLeaveModal]);

  const handleLeaveGroup = async () => {
    setActionModalVisible(false);
    setLeaveCheckLoading(true);
    setShowLeaveModal(true);

    const result = await checkCanLeave(selectedGroup.id);
    setLeaveInfo({
      canLeave: result.canLeave,
      pendingCount: result.pendingCount || 0,
      balance: result.balance || 0,
      blockReason: result.blockReason || '',
      willDelete: result.willDelete || false,
      isLastMember: result.isLastMember || false,
    });
    setLeaveCheckLoading(false);
  };

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    const result = await leaveGroup(selectedGroup.id);
    setIsLeaving(false);

    if (result.success) {
      setShowLeaveModal(false);
      showToast(result.deleted ? 'Group deleted' : 'Left group successfully', 'success');
    } else {
      showToast(result.error || 'Failed to leave group', 'error');
    }
  };

  const getLeaveBlockMessage = () => {
    const { blockReason, pendingCount, balance } = leaveInfo;
    const absBalance = Math.abs(balance).toFixed(2);

    switch (blockReason) {
      case 'pending_settlements':
        return `You have ${pendingCount} pending settlement${pendingCount > 1 ? 's' : ''} awaiting confirmation. Please confirm or cancel them before leaving.`;
      case 'you_owe':
        return `You owe ₹${absBalance} to other members. Please settle your balance before leaving the group.`;
      case 'owed_to_you':
        return `Other members owe you ₹${absBalance}. Please have them settle up before leaving, or the balance will be lost.`;
      default:
        return 'Unable to leave group at this time.';
    }
  };

  const getLeaveBlockTitle = () => {
    const { blockReason } = leaveInfo;
    switch (blockReason) {
      case 'pending_settlements':
        return 'Pending Settlements';
      case 'you_owe':
        return 'Outstanding Balance';
      case 'owed_to_you':
        return 'Money Owed to You';
      default:
        return 'Cannot Leave';
    }
  };

  const handleDeleteGroup = () => {
    setConfirmAction('delete');
    setActionModalVisible(false);
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (confirmAction === 'delete') {
      const result = await deleteGroup(selectedGroup.id);
      if (result.success) {
        showToast('Group deleted successfully', 'success');
        setConfirmModalVisible(false);
      } else {
        showToast(result.error, 'error');
      }
    }
  };

  // Filter and sort groups by most recent activity
  const filteredGroups = groups
    .filter(group => group.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aDate = getGroupLastActivity(a);
      const bDate = getGroupLastActivity(b);
      return bDate - aDate; // Most recent first
    });

  if (isLoading && !refreshing) {
    return <Loader fullScreen />;
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Groups</Text>
          {groups.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{groups.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon={<Ionicons name="key-outline" size={20} color={colors.textPrimary} />}
            onPress={() => setJoinModalVisible(true)}
            variant="glass"
            size={40}
            style={styles.headerButton}
          />
          <IconButton
            icon={<Ionicons name="add" size={24} color={colors.textPrimary} />}
            onPress={() => setCreateModalVisible(true)}
            variant="primary"
            size={40}
          />
        </View>
      </View>

      {/* Search Bar */}
      {groups.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.primary}
          />
        }
      >
        {filteredGroups.length === 0 && searchQuery === '' ? (
          <CardGlass style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyText}>
              Create a new group or join an existing one to get started
            </Text>
            <View style={styles.emptyActions}>
              <AppButton
                title="Create Group"
                onPress={() => setCreateModalVisible(true)}
                style={styles.emptyButton}
              />
              <AppButton
                title="Join Group"
                onPress={() => setJoinModalVisible(true)}
                variant="outline"
                style={styles.emptyButton}
              />
            </View>
          </CardGlass>
        ) : filteredGroups.length === 0 ? (
          <CardGlass style={styles.emptyCard}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No groups found</Text>
            <Text style={styles.emptyText}>
              Try a different search term
            </Text>
          </CardGlass>
        ) : (
          filteredGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              <CardGlass style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupIcon}>
                    {group.icon_type === 'custom' && group.icon_url ? (
                      <Image
                        source={{ uri: group.icon_url.startsWith('http') ? group.icon_url : `${BASE_URL}${group.icon_url}` }}
                        style={styles.groupIconImage}
                      />
                    ) : group.icon_type === 'predefined' && group.icon_url ? (
                      <Text style={styles.groupIconEmoji}>
                        {PREDEFINED_GROUP_ICONS.find(i => i.id === group.icon_url)?.emoji || '👥'}
                      </Text>
                    ) : (
                      <Text style={styles.groupIconText}>
                        {group.name?.charAt(0).toUpperCase() || 'G'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupDescription}>
                      {group.description || 'No description'}
                    </Text>
                    <View style={styles.groupStats}>
                      <Text style={styles.groupMembers}>
                        {group.members?.length || 0} members
                      </Text>
                      <Text style={styles.groupSeparator}>•</Text>
                      <Text style={styles.groupExpenses}>
                        {group.expenses?.length || 0} expenses
                      </Text>
                    </View>
                    <Text style={[styles.groupTotal, { color: accent.primary }]}>
                      {formatCurrency(group.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0)} total
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleGroupActions(group);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.groupActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShareInvite(group);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} style={styles.actionIcon} />
                    <Text style={styles.actionText}>Invite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton, { backgroundColor: `${accent.primary}20`, borderColor: accent.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('GroupDetail', { groupId: group.id });
                    }}
                  >
                    <Text style={styles.actionText}>View</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </CardGlass>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <CardGlass style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create New Group</Text>
                <AppInput
                  label="Group Name"
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g., Roommates, Trip to Goa"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (groupName.trim()) {
                      Keyboard.dismiss();
                      handleCreateGroup();
                    }
                  }}
                />
                <AppInput
                  label="Description (Optional)"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="What is this group for?"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalActions}>
                  <AppButton
                    title="Cancel"
                    onPress={() => {
                      Keyboard.dismiss();
                      setCreateModalVisible(false);
                      setGroupName('');
                      setGroupDescription('');
                    }}
                    variant="ghost"
                    style={styles.modalButton}
                  />
                  <AppButton
                    title="Create"
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCreateGroup();
                    }}
                    loading={isLoading}
                    disabled={!groupName.trim()}
                    style={styles.modalButton}
                  />
                </View>
              </CardGlass>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!joinLoading) {
            setJoinModalVisible(false);
            setJoinCode('');
            setJoinError('');
          }
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <CardGlass style={styles.modalContent}>
                <Text style={styles.modalTitle}>Join Group</Text>
                <AppInput
                  label="Invite Code"
                  value={joinCode}
                  onChangeText={(text) => {
                    setJoinCode(text);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="Enter invite code"
                  autoCapitalize="characters"
                  returnKeyType="done"
                  error={joinError}
                  onSubmitEditing={() => {
                    if (joinCode.trim()) {
                      Keyboard.dismiss();
                      handleJoinGroup();
                    }
                  }}
                />
                <View style={styles.modalActions}>
                  <AppButton
                    title="Cancel"
                    onPress={() => {
                      Keyboard.dismiss();
                      setJoinModalVisible(false);
                      setJoinCode('');
                      setJoinError('');
                    }}
                    variant="ghost"
                    disabled={joinLoading}
                    style={styles.modalButton}
                  />
                  <AppButton
                    title="Join"
                    onPress={() => {
                      Keyboard.dismiss();
                      handleJoinGroup();
                    }}
                    loading={joinLoading}
                    disabled={!joinCode.trim() || joinLoading}
                    style={styles.modalButton}
                  />
                </View>
              </CardGlass>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Share Invite Modal */}
      <InviteModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        group={selectedGroup}
      />

      {/* Edit Group Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <CardGlass style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Group</Text>

            {/* Icon Section */}
            <TouchableOpacity
              style={styles.editIconContainer}
              onPress={() => {
                setEditModalVisible(false);
                setShowIconPicker(true);
              }}
            >
              <View style={[styles.editIconPreview, { backgroundColor: accent.primary + '30' }]}>
                {renderSelectedGroupIcon(48, 24)}
              </View>
              <View style={styles.editIconInfo}>
                <Text style={styles.editIconLabel}>Group Icon</Text>
                <Text style={styles.editIconHint}>Tap to change</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <AppInput
              label="Group Name"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
            />
            <AppInput
              label="Description (Optional)"
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="What is this group for?"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => {
                  setEditModalVisible(false);
                  setGroupName('');
                  setGroupDescription('');
                }}
                variant="ghost"
                style={styles.modalButton}
              />
              <AppButton
                title="Update"
                onPress={handleUpdateGroup}
                loading={isLoading}
                style={styles.modalButton}
              />
            </View>
          </CardGlass>
        </KeyboardAvoidingView>
      </Modal>

      {/* Group Actions Modal */}
      <Modal
        visible={actionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <CardGlass style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>{selectedGroup?.name}</Text>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleEditGroup}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionMenuText}>Edit Group</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleLeaveGroup}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="exit-outline" size={20} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionMenuText}>Leave Group</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionModalVisible(false);
                setExportModalVisible(true);
              }}
            >
              <View style={styles.actionMenuIconContainer}>
                <Ionicons name="download-outline" size={20} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionMenuText}>Export Data</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleDeleteGroup}
            >
              <View style={[styles.actionMenuIconContainer, styles.deleteIconContainer]}>
                <Ionicons name="trash-outline" size={20} color={colors.error || '#ef4444'} />
              </View>
              <Text style={[styles.actionMenuText, styles.deleteText]}>Delete Group</Text>
            </TouchableOpacity>
          </CardGlass>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <CardGlass style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Group?</Text>
            <Text style={styles.confirmText}>
              This will permanently delete the group and all its expenses. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => setConfirmModalVisible(false)}
                variant="ghost"
                style={styles.modalButton}
              />
              <AppButton
                title="Delete"
                onPress={handleConfirmAction}
                loading={isLoading}
                variant="outline"
                style={styles.modalButton}
              />
            </View>
          </CardGlass>
        </View>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        groupName={selectedGroup?.name || ''}
        isLoading={exportLoading}
        onExport={async (exportOptions) => {
          try {
            setExportLoading(true);
            const response = await apiClient.post('/io/export/request', {
              group_id: selectedGroup?.id,
              format: exportOptions.format,
              from_date: exportOptions.fromDate,
              to_date: exportOptions.toDate,
              include_settlements: exportOptions.includeSettlements,
            });
            setExportModalVisible(false);
            showToast(response.data.message || 'Export will be sent to your email', 'success');
          } catch (error) {
            showToast(error.response?.data?.error || 'Failed to request export', 'error');
          } finally {
            setExportLoading(false);
          }
        }}
      />

      {/* Leave Group Modal */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLeaving && setShowLeaveModal(false)}
      >
        <View style={styles.leaveModalOverlay}>
          <TouchableOpacity
            style={styles.leaveModalBackdrop}
            activeOpacity={1}
            onPress={() => !isLeaving && setShowLeaveModal(false)}
          />
          <Animated.View
            style={[
              styles.leaveModalContainer,
              {
                opacity: leaveModalAnim,
                transform: [
                  {
                    scale: leaveModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.98)']}
              style={styles.leaveModalContent}
            >
              {leaveCheckLoading ? (
                <View style={styles.leaveModalLoading}>
                  <ActivityIndicator size="large" color={accent.primary} />
                  <Text style={styles.leaveModalLoadingText}>Checking...</Text>
                </View>
              ) : (
                <>
                  {/* Icon */}
                  <Animated.View
                    style={[
                      styles.leaveModalIconContainer,
                      leaveInfo.canLeave ? styles.leaveIconWarning : styles.leaveIconError,
                      {
                        transform: [
                          {
                            scale: leaveIconAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0, 1.2, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        leaveInfo.canLeave
                          ? 'exit-outline'
                          : leaveInfo.blockReason === 'owed_to_you'
                          ? 'wallet-outline'
                          : leaveInfo.blockReason === 'you_owe'
                          ? 'card-outline'
                          : 'time-outline'
                      }
                      size={40}
                      color={leaveInfo.canLeave ? colors.warning : colors.error}
                    />
                  </Animated.View>

                  {/* Title */}
                  <Text style={styles.leaveModalTitle}>
                    {leaveInfo.canLeave
                      ? leaveInfo.willDelete
                        ? 'Delete Group?'
                        : 'Leave Group?'
                      : getLeaveBlockTitle()}
                  </Text>

                  {/* Message */}
                  <Text style={styles.leaveModalMessage}>
                    {!leaveInfo.canLeave
                      ? getLeaveBlockMessage()
                      : leaveInfo.willDelete
                      ? "You're the last member. Leaving will permanently delete this group and all its data."
                      : `Are you sure you want to leave "${selectedGroup?.name}"? You can rejoin later with an invite.`}
                  </Text>

                  {/* Actions */}
                  <View style={[styles.leaveModalActions, !leaveInfo.canLeave && styles.leaveModalActionsVertical]}>
                    {leaveInfo.canLeave ? (
                      <>
                        <TouchableOpacity
                          style={[styles.leaveModalButton, styles.leaveModalCancelButton]}
                          onPress={() => setShowLeaveModal(false)}
                          disabled={isLeaving}
                        >
                          <Text style={styles.leaveModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.leaveModalButton,
                            styles.leaveModalConfirmButton,
                            isLeaving && styles.leaveModalButtonDisabled,
                          ]}
                          onPress={handleConfirmLeave}
                          disabled={isLeaving}
                        >
                          {isLeaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.leaveModalConfirmText}>
                              {leaveInfo.willDelete ? 'Delete' : 'Leave'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.leaveModalButton, styles.leaveModalFullButton, { backgroundColor: accent.primary }]}
                          onPress={() => {
                            setShowLeaveModal(false);
                            if (leaveInfo.blockReason === 'pending_settlements') {
                              navigation.navigate('PendingSettlements');
                            } else {
                              navigation.navigate('GroupDetail', { groupId: selectedGroup?.id });
                            }
                          }}
                        >
                          <Ionicons
                            name={leaveInfo.blockReason === 'pending_settlements' ? 'time-outline' : 'wallet-outline'}
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.leaveModalConfirmText}>
                            {leaveInfo.blockReason === 'pending_settlements' ? 'View Pending' : 'View Group'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.leaveModalButton, styles.leaveModalCloseButton]}
                          onPress={() => setShowLeaveModal(false)}
                        >
                          <Text style={styles.leaveModalCancelText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Group Icon Picker */}
      <GroupIconPicker
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        currentIcon={selectedGroup?.icon_url}
        currentIconType={selectedGroup?.icon_type}
        onSelectPredefined={handleSelectPredefinedIcon}
        onSelectCustom={handleSelectCustomIcon}
        onRemove={handleRemoveIcon}
        isLoading={isIconUpdating}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.glass,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    marginRight: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyButton: {
    minWidth: 120,
  },
  groupCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupIconText: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  groupIconImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupIconEmoji: {
    fontSize: 28,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  groupActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  viewButton: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundLight,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  editIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  editIconPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  editIconInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  editIconLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editIconHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  shareText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
    marginRight: spacing.md,
  },
  copyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  copyButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  shareMessage: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupSeparator: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  groupExpenses: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  groupTotal: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  menuButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  actionModalContent: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    margin: spacing.lg,
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  actionMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionMenuText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  deleteText: {
    color: colors.error || '#ef4444',
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  confirmText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  // Leave Modal Styles
  leaveModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  leaveModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  leaveModalContainer: {
    width: Dimensions.get('window').width - spacing.xl * 2,
    maxWidth: 400,
  },
  leaveModalContent: {
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  leaveModalLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  leaveModalLoadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
  leaveModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  leaveIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  leaveIconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  leaveModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  leaveModalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  leaveModalActions: {
    width: '100%',
    flexDirection: 'row',
  },
  leaveModalActionsVertical: {
    flexDirection: 'column',
  },
  leaveModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  leaveModalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: spacing.sm,
  },
  leaveModalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
  },
  leaveModalFullButton: {
    // backgroundColor set dynamically
  },
  leaveModalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.sm,
  },
  leaveModalButtonDisabled: {
    opacity: 0.6,
  },
  leaveModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaveModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default GroupsScreen;
