import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
  TextInput,
  LayoutAnimation,
  UIManager,
  Image,
  Modal,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { colors as staticColors } from '../../theme/colors';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import SectionContainer from '../../components/common/SectionContainer';
import Loader from '../../components/common/Loader';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import useGroupStore from '../../store/groupStore';
import useExpenseStore from '../../store/expenseStore';
import useAuthStore from '../../store/authStore';
import { getCategoryIcon } from '../../constants/categories';
import { PREDEFINED_GROUP_ICONS } from '../../constants/groupIcons';
import { formatCurrency } from '../../utils/currency';
import { BASE_URL } from '../../api/client';
import InviteModal from '../../components/InviteModal';
import GroupIconPicker from '../../components/common/GroupIconPicker';
import GroupActionMenu from '../../components/common/GroupActionMenu';
import { useAccentColor } from '../../store/themeStore';

const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { currentGroup, fetchGroupDetails, isLoading: groupLoading, checkCanLeave, leaveGroup, updateGroup, updateGroupIcon, uploadGroupIcon, removeGroupIcon } = useGroupStore();
  const { expenses, fetchGroupExpenses, deleteExpense, isLoading: expensesLoading } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const accent = useAccentColor();

  // Collapsible sections
  const [showMembers, setShowMembers] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Leave group modal
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

  // Options menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Edit group modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Icon picker
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isIconUpdating, setIsIconUpdating] = useState(false);

  // Expense filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, settled
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null); // 'from' or 'to'
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Refresh data when screen is focused (including when returning from edit)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [groupId])
  );

  const loadData = async () => {
    await fetchGroupDetails(groupId);
    await fetchGroupExpenses(groupId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Leave modal animation
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

  const handleLeaveGroupPress = async () => {
    setShowOptionsMenu(false);
    setLeaveCheckLoading(true);
    setShowLeaveModal(true);

    const result = await checkCanLeave(groupId);
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

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    const result = await leaveGroup(groupId);
    setIsLeaving(false);

    if (result.success) {
      setShowLeaveModal(false);
      navigation.goBack();
      // Show toast after navigation
      setTimeout(() => {
        setToast({
          visible: true,
          message: result.deleted ? 'Group deleted' : 'Left group successfully',
          type: 'success',
        });
      }, 100);
    } else {
      setToast({
        visible: true,
        message: result.error || 'Failed to leave group',
        type: 'error',
      });
    }
  };

  const handleShareInvite = () => {
    setShareModalVisible(true);
  };

  const handleEditGroup = () => {
    setShowOptionsMenu(false);
    setEditName(currentGroup?.name || '');
    setEditDescription(currentGroup?.description || '');
    setShowEditModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim()) {
      setToast({ visible: true, message: 'Group name is required', type: 'error' });
      return;
    }
    setIsUpdating(true);
    const result = await updateGroup(groupId, editName.trim(), editDescription.trim());
    setIsUpdating(false);
    if (result.success) {
      await fetchGroupDetails(groupId);
      setShowEditModal(false);
      setToast({ visible: true, message: 'Group updated', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to update group', type: 'error' });
    }
  };

  const handleSelectPredefinedIcon = async (iconId) => {
    setIsIconUpdating(true);
    const result = await updateGroupIcon(groupId, iconId);
    setIsIconUpdating(false);
    if (result.success) {
      setShowIconPicker(false);
      setToast({ visible: true, message: 'Icon updated', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to update icon', type: 'error' });
    }
  };

  const handleSelectCustomIcon = async (imageUri) => {
    setIsIconUpdating(true);
    const result = await uploadGroupIcon(groupId, imageUri);
    setIsIconUpdating(false);
    if (result.success) {
      setShowIconPicker(false);
      setToast({ visible: true, message: 'Icon updated', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to upload icon', type: 'error' });
    }
  };

  const handleRemoveIcon = async () => {
    setIsIconUpdating(true);
    const result = await removeGroupIcon(groupId);
    setIsIconUpdating(false);
    if (result.success) {
      setShowIconPicker(false);
      setToast({ visible: true, message: 'Icon removed', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to remove icon', type: 'error' });
    }
  };

  // Helper to render group icon
  const renderGroupIcon = (size = 40, fontSize = 20) => {
    if (currentGroup?.icon_type === 'custom' && currentGroup?.icon_url) {
      return (
        <Image
          source={{ uri: currentGroup.icon_url.startsWith('http') ? currentGroup.icon_url : `${BASE_URL}${currentGroup.icon_url}` }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    if (currentGroup?.icon_type === 'predefined' && currentGroup?.icon_url) {
      const icon = PREDEFINED_GROUP_ICONS.find(i => i.id === currentGroup.icon_url);
      return <Text style={{ fontSize }}>{icon?.emoji || '👥'}</Text>;
    }
    return <Text style={{ fontSize }}>👥</Text>;
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { groupId });
  };

  const handleDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const performDelete = async (expenseId) => {
    const result = await deleteExpense(expenseId);
    if (result.success) {
      setToast({ visible: true, message: 'Expense deleted', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to delete expense', type: 'error' });
    }
  };

  const calculateBalance = () => {
    let totalExpense = 0;
    let amountIPaid = 0;
    let myTotalShare = 0;

    expenses.forEach(expense => {
      totalExpense += expense.amount;

      if (expense.paid_by_id === user?.id) {
        amountIPaid += expense.amount;
      }

      if (!expense.is_settled) {
        // Calculate my share from splits
        const mySplit = expense.splits?.find(split => split.user_id === user?.id);
        if (mySplit) {
          myTotalShare += mySplit.amount || 0;
        }
      }
    });

    // If I paid more than my share, others owe me (negative means I get back)
    // If I paid less than my share, I owe others (positive means I need to pay)
    const amountINeedToPay = myTotalShare - amountIPaid;

    return {
      totalExpense,
      amountIPaid,
      amountINeedToPay: amountINeedToPay > 0 ? amountINeedToPay : 0,
      amountIOweToGet: amountINeedToPay < 0 ? Math.abs(amountINeedToPay) : 0
    };
  };

  const calculateMemberPayments = () => {
    const payments = {};

    expenses.forEach(expense => {
      const paidById = expense.paid_by_id;
      const paidByName = expense.paid_by?.name || currentGroup?.members?.find(m => m.id === paidById)?.name || 'Unknown';

      if (!payments[paidById]) {
        payments[paidById] = {
          name: paidByName,
          amount: 0,
        };
      }
      payments[paidById].amount += expense.amount;
    });

    return Object.values(payments);
  };

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Filter by status
    if (filterStatus === 'pending') {
      filtered = filtered.filter(e => !e.is_settled);
    } else if (filterStatus === 'settled') {
      filtered = filtered.filter(e => e.is_settled);
    }

    // Filter by date range
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => new Date(e.date || e.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date || e.created_at) <= to);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.paid_by?.name?.toLowerCase().includes(query) ||
        e.category?.name?.toLowerCase().includes(query) ||
        e.amount.toString().includes(query) ||
        e.amount.toFixed(2).includes(query)
      );
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at);
      const dateB = new Date(b.date || b.created_at);
      return dateB - dateA;
    });
  }, [expenses, filterStatus, searchQuery, fromDate, toDate]);

  const formatDateShort = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleDateConfirm = (date) => {
    if (showDatePicker === 'from') {
      setFromDate(date);
      if (toDate && date > toDate) {
        setToDate(null);
      }
    } else {
      setToDate(date);
    }
    setShowDatePicker(null);
  };

  const hasActiveFilters = filterStatus !== 'all' || searchQuery.trim() || fromDate || toDate;

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFromDate(null);
    setToDate(null);
  };

  const toggleSection = (section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'members') {
      setShowMembers(!showMembers);
    } else if (section === 'chart') {
      setShowChart(!showChart);
    }
  };

  if (groupLoading && !refreshing) {
    return <Loader fullScreen />;
  }

  const { totalExpense, amountIPaid, amountINeedToPay, amountIOweToGet } = calculateBalance();
  const memberPayments = calculateMemberPayments();

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <TouchableOpacity
              style={[styles.headerIcon, { backgroundColor: accent.primary + '30' }]}
              onPress={() => setShowIconPicker(true)}
              activeOpacity={0.7}
            >
              {renderGroupIcon(36, 18)}
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {currentGroup?.name || 'Group'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Options Menu Modal */}
        <GroupActionMenu
          visible={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          group={currentGroup}
          context="detail"
          actions={{
            onInvite: handleShareInvite,
            onEdit: handleEditGroup,
            onActivity: () => navigation.navigate('Activity', { groupId }),
            onAnalytics: () => navigation.navigate('Analytics', { groupId, groupName: currentGroup?.name }),
            onLeave: handleLeaveGroupPress,
          }}
        />
        {/* Group Info */}
        <CardGlass style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Members</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{currentGroup?.members?.length || 0}</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Expenses</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{expenses.length}</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Total</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(totalExpense)}
              </Text>
            </View>
          </View>
          <View style={[styles.infoRow, styles.infoRowSecond, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>You Paid</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(amountIPaid)}
              </Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{amountIOweToGet > 0 ? 'You Get' : 'You Owe'}</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: amountIOweToGet > 0 ? colors.success : colors.error }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(amountIOweToGet > 0 ? amountIOweToGet : amountINeedToPay)}
              </Text>
            </View>
          </View>
        </CardGlass>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <AppButton
            title="Add Expense"
            onPress={handleAddExpense}
            icon={<Ionicons name="add" size={20} color={colors.textPrimary} />}
            style={[styles.addButton, (amountINeedToPay === 0 && amountIOweToGet === 0) && styles.addButtonFull]}
          />
          {(amountINeedToPay > 0 || amountIOweToGet > 0) ? (
            <AppButton
              title="Settle Up"
              onPress={() => navigation.navigate('SettleUp', { groupId, groupName: currentGroup?.name })}
              variant="outline"
              icon={<Ionicons name="wallet-outline" size={20} color={accent.primary} />}
              style={styles.settleButton}
            />
          ) : null}
        </View>

        {/* Collapsible Members Section */}
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => toggleSection('members')}
          activeOpacity={0.7}
        >
          <View style={styles.collapsibleLeft}>
            <Ionicons name="people-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>Members</Text>
            <View style={[styles.collapsibleBadge, { backgroundColor: accent.primary }]}>
              <Text style={[styles.collapsibleBadgeText, { color: colors.textPrimary }]}>{currentGroup?.members?.length || 0}</Text>
            </View>
          </View>
          <Ionicons
            name={showMembers ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {showMembers && (
          <CardGlass style={styles.membersCard}>
            {currentGroup?.members?.map((member, index) => (
              <View key={member.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />}
                <View style={styles.memberRow}>
                  <View style={[
                    styles.memberAvatar,
                    { backgroundColor: accent.primary },
                    member.id === user?.id && { backgroundColor: colors.success }
                  ]}>
                    {member.avatar_url ? (
                      <Image
                        source={{
                          uri: member.avatar_url.startsWith('http')
                            ? member.avatar_url
                            : `${BASE_URL}${member.avatar_url}`
                        }}
                        style={styles.memberAvatarImage}
                      />
                    ) : (
                      <Text style={[styles.memberAvatarText, { color: colors.textPrimary }]}>
                        {member.name?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                      {member.name}
                      {member.id === user?.id && <Text style={[styles.youBadge, { color: colors.success }]}> (You)</Text>}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{member.email}</Text>
                  </View>
                </View>
              </View>
            ))}
          </CardGlass>
        )}

        {/* Collapsible Payment Distribution */}
        {memberPayments.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('chart')}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleLeft}>
                <Ionicons name="pie-chart-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>Payment Distribution</Text>
              </View>
              <Ionicons
                name={showChart ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showChart && (
              <CardGlass style={styles.chartCard}>
                <PieChart
                  data={memberPayments.map((payment, index) => ({
                    name: payment.name === user?.name ? 'You' : payment.name,
                    amount: payment.amount,
                    color: index === 0 ? accent.primary :
                      index === 1 ? colors.success || '#22c55e' :
                        index === 2 ? colors.error || '#ef4444' :
                          index === 3 ? '#f59e0b' :
                            index === 4 ? '#8b5cf6' : '#06b6d4',
                    legendFontColor: colors.textPrimary,
                    legendFontSize: 12,
                  }))}
                  width={Dimensions.get('window').width - spacing.lg * 4}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </CardGlass>
            )}
          </>
        )}

        {/* Expenses Section */}
        <SectionContainer title="Expenses">
          {/* Search Bar */}
          <View style={styles.expenseSearchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.expenseSearchInput, { color: colors.textPrimary }]}
              placeholder="Search expenses..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'settled', label: 'Settled' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterPill,
                  filterStatus === filter.key && [styles.filterPillActive, { backgroundColor: accent.primary }]
                ]}
                onPress={() => setFilterStatus(filter.key)}
              >
                <Text style={[
                  styles.filterPillText,
                  { color: filterStatus === filter.key ? colors.textPrimary : colors.textMuted }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Range Filter */}
          <View style={styles.dateFilterRow}>
            <TouchableOpacity
              style={[styles.datePill, fromDate && [styles.datePillActive, { backgroundColor: accent.primary }]]}
              onPress={() => setShowDatePicker('from')}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={fromDate ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.datePillText, { color: fromDate ? colors.textPrimary : colors.textMuted }]}>
                {fromDate ? formatDateShort(fromDate) : 'From'}
              </Text>
              {fromDate && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setFromDate(null); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={14} color={colors.textPrimary} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} style={styles.dateArrowIcon} />

            <TouchableOpacity
              style={[styles.datePill, toDate && [styles.datePillActive, { backgroundColor: accent.primary }]]}
              onPress={() => setShowDatePicker('to')}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={toDate ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.datePillText, { color: toDate ? colors.textPrimary : colors.textMuted }]}>
                {toDate ? formatDateShort(toDate) : 'To'}
              </Text>
              {toDate && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setToDate(null); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={14} color={colors.textPrimary} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Active filters & count */}
          <View style={styles.filterInfoRow}>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={[styles.clearFiltersLink, { color: accent.primary }]}>Clear filters</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.expenseCount, { color: colors.textMuted }]}>
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
          </View>

          {expensesLoading ? (
            <Loader />
          ) : filteredExpenses.length === 0 ? (
            <CardGlass style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>{hasActiveFilters ? '🔍' : '📝'}</Text>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Add your first expense to get started'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={[styles.clearFiltersBtn, { backgroundColor: accent.primary }]}
                  onPress={clearAllFilters}
                >
                  <Text style={[styles.clearFiltersBtnText, { color: colors.textPrimary }]}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </CardGlass>
          ) : (
            filteredExpenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AddExpense', {
                  groupId,
                  expense: expense
                })}
              >
                <CardGlass style={[
                  styles.expenseCard,
                  expense.is_settled && styles.expenseCardSettled
                ]}>
                  <View style={styles.expenseHeader}>
                    <View style={[
                      styles.expenseIcon,
                      { backgroundColor: colors.glass },
                      expense.is_settled && styles.expenseIconSettled
                    ]}>
                      <Text style={styles.expenseIconText}>
                        {expense.is_settled ? '✓' : getCategoryIcon(expense.category_id || expense.category?.name)}
                      </Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>{expense.title}</Text>
                      <Text style={[styles.expenseDate, { color: colors.textMuted }]}>
                        {new Date(expense.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.expenseAmount}>
                      <Text style={[
                        styles.expenseAmountText,
                        { color: expense.is_settled ? colors.success : colors.textPrimary }
                      ]}>
                        {formatCurrency(expense.amount)}
                      </Text>
                      {expense.is_settled && (
                        <View style={styles.settledBadgeContainer}>
                          <Text style={styles.settledBadge}>Settled</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteExpense(expense);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error || '#ef4444'} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.expenseMeta}>
                    <Text style={[styles.expenseMetaText, { color: colors.textMuted }]}>
                      Paid by {expense.paid_by_id === user?.id ? 'you' : (expense.paid_by?.name || 'Someone')}
                    </Text>
                    <Text style={[styles.expenseMetaDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.expenseMetaText, { color: colors.textMuted }]}>
                      {expense.split_type}
                    </Text>
                  </View>
                </CardGlass>
              </TouchableOpacity>
            ))
          )}
        </SectionContainer>
        <Toast {...toast} onHide={() => setToast({ ...toast, visible: false })} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showDatePicker !== null}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(null)}
        date={showDatePicker === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
        maximumDate={showDatePicker === 'from' ? (toDate || new Date()) : new Date()}
        minimumDate={showDatePicker === 'to' ? fromDate : undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expenseToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setShowDeleteModal(false);
          if (expenseToDelete) {
            performDelete(expenseToDelete.id);
          }
          setExpenseToDelete(null);
        }}
        onCancel={() => {
          setShowDeleteModal(false);
          setExpenseToDelete(null);
        }}
      />

      <InviteModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        group={currentGroup}
      />

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdating && setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableOpacity
            style={styles.editModalBackdrop}
            activeOpacity={1}
            onPress={() => !isUpdating && setShowEditModal(false)}
          />
          <View style={styles.editModalContainer}>
            <LinearGradient
              colors={isDark ? ['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.98)'] : ['rgba(255, 255, 255, 0.98)', 'rgba(241, 245, 249, 0.98)']}
              style={[styles.editModalContent, { borderColor: colors.glassBorder }]}
            >
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>Edit Group</Text>

              {/* Icon Section */}
              <TouchableOpacity
                style={[styles.editIconContainer, { borderColor: colors.glassBorder }]}
                onPress={() => {
                  setShowEditModal(false);
                  setShowIconPicker(true);
                }}
                disabled={isUpdating}
              >
                <View style={[styles.editIconPreview, { backgroundColor: accent.primary + '30' }]}>
                  {renderGroupIcon(56, 28)}
                </View>
                <View style={styles.editIconInfo}>
                  <Text style={[styles.editIconLabel, { color: colors.textPrimary }]}>Group Icon</Text>
                  <Text style={[styles.editIconHint, { color: colors.textMuted }]}>Tap to change</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.editInputContainer}>
                <Text style={[styles.editInputLabel, { color: colors.textSecondary }]}>Name</Text>
                <TextInput
                  style={[styles.editInput, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Group name"
                  placeholderTextColor={colors.textMuted}
                  editable={!isUpdating}
                />
              </View>

              <View style={styles.editInputContainer}>
                <Text style={[styles.editInputLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.editInput, styles.editInputMultiline, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Group description (optional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  editable={!isUpdating}
                />
              </View>

              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalCancelButton]}
                  onPress={() => setShowEditModal(false)}
                  disabled={isUpdating}
                >
                  <Text style={[styles.editModalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editModalButton,
                    styles.editModalSaveButton,
                    { backgroundColor: accent.primary },
                    isUpdating && styles.editModalButtonDisabled,
                  ]}
                  onPress={handleUpdateGroup}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editModalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Group Icon Picker */}
      <GroupIconPicker
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        currentIcon={currentGroup?.icon_url}
        currentIconType={currentGroup?.icon_type}
        onSelectPredefined={handleSelectPredefinedIcon}
        onSelectCustom={handleSelectCustomIcon}
        onRemove={handleRemoveIcon}
        isLoading={isIconUpdating}
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
              colors={isDark ? ['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.98)'] : ['rgba(255, 255, 255, 0.98)', 'rgba(241, 245, 249, 0.98)']}
              style={[styles.leaveModalContent, { borderColor: colors.glassBorder }]}
            >
              {leaveCheckLoading ? (
                <View style={styles.leaveModalLoading}>
                  <ActivityIndicator size="large" color={accent.primary} />
                  <Text style={[styles.leaveModalLoadingText, { color: colors.textMuted }]}>Checking...</Text>
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
                  <Text style={[styles.leaveModalTitle, { color: colors.textPrimary }]}>
                    {leaveInfo.canLeave
                      ? leaveInfo.willDelete
                        ? 'Delete Group?'
                        : 'Leave Group?'
                      : getLeaveBlockTitle()}
                  </Text>

                  {/* Message */}
                  <Text style={[styles.leaveModalMessage, { color: colors.textSecondary }]}>
                    {!leaveInfo.canLeave
                      ? getLeaveBlockMessage()
                      : leaveInfo.willDelete
                      ? "You're the last member. Leaving will permanently delete this group and all its data."
                      : `Are you sure you want to leave "${currentGroup?.name}"? You can rejoin later with an invite.`}
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
                          <Text style={[styles.leaveModalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
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
                              navigation.navigate('SettleUp', { groupId, groupName: currentGroup?.name });
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
                            {leaveInfo.blockReason === 'pending_settlements' ? 'View Pending' : 'Settle Up'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.leaveModalButton, styles.leaveModalCloseButton]}
                          onPress={() => setShowLeaveModal(false)}
                        >
                          <Text style={[styles.leaveModalCancelText, { color: colors.textPrimary }]}>Close</Text>
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: staticColors.textPrimary,
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: 200,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoRowSecond: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.cardBorder,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: staticColors.textPrimary,
    textAlign: 'center',
  },
  balanceOwe: {
    color: staticColors.error,
  },
  balanceOwed: {
    color: staticColors.success,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: staticColors.cardBorder,
    marginHorizontal: spacing.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addButton: {
    flex: 1,
  },
  addButtonFull: {
    flex: 1,
  },
  settleButton: {
    flex: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  collapsibleBadge: {
    backgroundColor: staticColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  collapsibleBadgeText: {
    fontSize: 12,
    color: staticColors.textPrimary,
    fontWeight: '600',
  },
  chartCard: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: staticColors.textMuted,
  },
  clearFiltersBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: 8,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    color: staticColors.textPrimary,
    fontWeight: '600',
  },
  expenseSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  expenseSearchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: staticColors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillActive: {
    backgroundColor: staticColors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: staticColors.textMuted,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: staticColors.textPrimary,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.xs,
  },
  datePillActive: {
    backgroundColor: staticColors.primary,
  },
  datePillText: {
    fontSize: 13,
    color: staticColors.textMuted,
    fontWeight: '500',
  },
  datePillTextActive: {
    color: staticColors.textPrimary,
  },
  dateArrowIcon: {
    marginHorizontal: spacing.sm,
  },
  filterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  clearFiltersLink: {
    fontSize: 13,
    color: staticColors.primary,
    fontWeight: '500',
  },
  expenseCount: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginLeft: 'auto',
  },
  expenseCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  expenseCardSettled: {
    opacity: 0.7,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  expenseIconSettled: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  expenseIconText: {
    fontSize: 20,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: staticColors.textMuted,
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expenseAmountText: {
    fontSize: 18,
    fontWeight: '700',
    color: staticColors.textPrimary,
  },
  expenseAmountSettled: {
    color: staticColors.success || '#22c55e',
  },
  settledBadgeContainer: {
    marginTop: 4,
  },
  settledBadge: {
    fontSize: 10,
    color: staticColors.success || '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseMetaText: {
    fontSize: 12,
    color: staticColors.textMuted,
  },
  expenseMetaDot: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginHorizontal: spacing.xs,
  },
  membersCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarSelf: {
    backgroundColor: staticColors.success || '#22c55e',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: staticColors.textPrimary,
  },
  memberEmail: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  youBadge: {
    fontSize: 13,
    color: staticColors.success || '#22c55e',
    fontWeight: '400',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${staticColors.error || '#ef4444'}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.cardBorder,
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
    borderColor: staticColors.glassBorder,
  },
  leaveModalLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  leaveModalLoadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: staticColors.textMuted,
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
    color: staticColors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  leaveModalMessage: {
    fontSize: 15,
    color: staticColors.textSecondary,
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
    backgroundColor: staticColors.error,
  },
  leaveModalFullButton: {
    backgroundColor: staticColors.primary,
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
    color: staticColors.textPrimary,
  },
  leaveModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  editModalContainer: {
    width: Dimensions.get('window').width - spacing.xl * 2,
    maxWidth: 400,
  },
  editModalContent: {
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: staticColors.textPrimary,
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
    borderColor: staticColors.glassBorder,
  },
  editIconPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    color: staticColors.textPrimary,
  },
  editIconHint: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  editInputContainer: {
    marginBottom: spacing.md,
  },
  editInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: staticColors.textSecondary,
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: staticColors.textPrimary,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  editInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editModalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  editModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  editModalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: spacing.sm,
  },
  editModalSaveButton: {
    // backgroundColor set dynamically
  },
  editModalButtonDisabled: {
    opacity: 0.6,
  },
  editModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  editModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default GroupDetailScreen;
