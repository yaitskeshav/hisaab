import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import Loader from '../../components/common/Loader';
import useActivityStore from '../../store/activityStore';
import useGroupStore from '../../store/groupStore';
import { getCategoryIcon } from '../../constants/categories';
import { formatCurrency } from '../../utils/currency';

const ACTIVITY_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'group', label: 'Group' },
];

// Map activity types to filter keys
const EXPENSE_TYPES = ['expense_added', 'expense_edited', 'expense_deleted', 'expense_settled', 'expense_unsettled'];
const GROUP_TYPES = ['group_created', 'group_renamed', 'member_joined', 'member_left'];

const ActivityScreen = () => {
  const navigation = useNavigation();
  const { groups, fetchGroups } = useGroupStore();
  const { activities, isLoading, hasMore, fetchActivities, loadMore, resetActivities } = useActivityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);

  useEffect(() => {
    loadActivities();
    if (groups.length === 0) {
      fetchGroups();
    }
  }, []);

  const loadActivities = async () => {
    const filters = {};
    if (selectedGroupId) filters.groupId = selectedGroupId;
    await fetchActivities(1, 20, filters);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      const filters = {};
      if (selectedGroupId) filters.groupId = selectedGroupId;
      loadMore(filters);
    }
  };

  // Filter activities locally
  const filteredActivities = activities.filter(activity => {
    // Filter by type
    if (selectedType === 'expense' && !EXPENSE_TYPES.includes(activity.type)) return false;
    if (selectedType === 'group' && !GROUP_TYPES.includes(activity.type)) return false;

    // Filter by date range
    if (fromDate) {
      const actDate = new Date(activity.created_at);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (actDate < from) return false;
    }
    if (toDate) {
      const actDate = new Date(activity.created_at);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (actDate > to) return false;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = activity.expense_title?.toLowerCase().includes(query);
      const matchesGroup = activity.group_name?.toLowerCase().includes(query);
      const matchesUser = activity.user?.name?.toLowerCase().includes(query);
      const matchesDesc = activity.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesGroup && !matchesUser && !matchesDesc) return false;
    }

    return true;
  });

  const formatActivityDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined,
    });
  };

  const getActivityIcon = (activity) => {
    // For expense activities, show category icon
    if (['expense_added', 'expense_edited'].includes(activity.type) && activity.category_id) {
      return <Text style={{ fontSize: 20 }}>{getCategoryIcon(activity.category_id)}</Text>;
    }

    switch (activity.type) {
      case 'group_created':
        return <Ionicons name="add-circle" size={20} color={colors.success || '#22c55e'} />;
      case 'group_renamed':
        return <Ionicons name="create-outline" size={20} color={colors.primary} />;
      case 'member_joined':
        return <Ionicons name="person-add" size={20} color={colors.success || '#22c55e'} />;
      case 'member_left':
        return <Ionicons name="exit-outline" size={20} color={colors.warning || '#f59e0b'} />;
      case 'expense_added':
        return <Ionicons name="add" size={20} color={colors.primary} />;
      case 'expense_edited':
        return <Ionicons name="create-outline" size={20} color={colors.primary} />;
      case 'expense_deleted':
        return <Ionicons name="trash-outline" size={20} color={colors.error || '#ef4444'} />;
      case 'expense_settled':
        return <Ionicons name="checkmark-circle" size={20} color={colors.success || '#22c55e'} />;
      case 'expense_unsettled':
        return <Ionicons name="close-circle" size={20} color={colors.warning || '#f59e0b'} />;
      default:
        return <Ionicons name="ellipse" size={20} color={colors.textMuted} />;
    }
  };

  const getActivityDescription = (activity) => {
    const userName = activity.user?.name || 'Someone';
    const groupName = activity.group_name || 'a group';

    switch (activity.type) {
      case 'group_created':
        return `${userName} created "${activity.new_value || groupName}"`;
      case 'group_renamed':
        return `${userName} renamed "${activity.old_value}" to "${activity.new_value}"`;
      case 'member_joined':
        return `${userName} joined ${groupName}`;
      case 'member_left':
        return `${userName} left ${groupName}`;
      case 'expense_added':
        const amountStr = activity.amount ? ` of ${formatCurrency(activity.amount)}` : '';
        return `${userName} added "${activity.expense_title}" in ${groupName}${amountStr}`;
      case 'expense_edited':
        // Parse description for specific changes
        if (activity.description) {
          const changes = [];
          const parts = activity.description.split('|');

          for (const part of parts) {
            if (part.startsWith('amount_changed:')) {
              const vals = part.split(':');
              if (vals.length === 3) {
                changes.push(`amount ${formatCurrency(vals[1])} → ${formatCurrency(vals[2])}`);
              }
            } else if (part.startsWith('category_changed:')) {
              const vals = part.split(':');
              if (vals.length === 3) {
                changes.push(`category "${vals[1]}" → "${vals[2]}"`);
              }
            } else if (part.startsWith('title_changed:')) {
              const vals = part.split(':');
              if (vals.length === 3) {
                changes.push(`title "${vals[1]}" → "${vals[2]}"`);
              }
            }
          }

          if (changes.length > 0) {
            return `${userName} changed ${changes.join(', ')} in "${activity.expense_title}"`;
          }
        }
        // Check if title was changed (old format)
        if (activity.old_value && activity.new_value && activity.old_value !== activity.new_value) {
          return `${userName} renamed "${activity.old_value}" to "${activity.new_value}" in ${groupName}`;
        }
        return `${userName} edited "${activity.expense_title}" in ${groupName}`;
      case 'expense_deleted':
        const delAmtStr = activity.amount ? ` of ${formatCurrency(activity.amount)}` : '';
        return `${userName} deleted "${activity.expense_title || 'expense'}"${delAmtStr} from ${groupName}`;
      case 'expense_settled':
        return `${userName} settled "${activity.expense_title || 'expense'}" in ${groupName}`;
      case 'expense_unsettled':
        return `${userName} unsettled "${activity.expense_title || 'expense'}" in ${groupName}`;
      default:
        return activity.description || 'Activity';
    }
  };

  const getActivityIconBgStyle = (activity) => {
    switch (activity.type) {
      case 'expense_deleted':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
      case 'expense_settled':
      case 'group_created':
      case 'member_joined':
        return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
      case 'member_left':
      case 'expense_unsettled':
        return { backgroundColor: 'rgba(245, 158, 11, 0.2)' };
      default:
        return {};
    }
  };

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedGroupId(null);
    setSearchQuery('');
    setFromDate(null);
    setToDate(null);
    resetActivities();
    fetchActivities(1, 20, {});
  };

  const hasActiveFilters = selectedType !== 'all' || selectedGroupId !== null || searchQuery.trim() || fromDate || toDate;

  const formatDateShort = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleDateConfirm = (date) => {
    if (showDatePicker === 'from') {
      setFromDate(date);
      if (toDate && date > toDate) setToDate(null);
    } else {
      setToDate(date);
    }
    setShowDatePicker(null);
  };

  const handleGroupFilterChange = (groupId) => {
    setSelectedGroupId(groupId);
    setShowFilters(false);
    resetActivities();
    const filters = groupId ? { groupId } : {};
    fetchActivities(1, 20, filters);
  };

  const handleActivityPress = (activity) => {
    // Check if it's an expense-related activity with existing expense
    const isExpenseActivity = ['expense_added', 'expense_edited', 'expense_settled', 'expense_unsettled'].includes(activity.type);

    if (isExpenseActivity && activity.expense_id) {
      // Navigate to expense edit screen
      navigation.navigate('AddExpense', {
        groupId: activity.group_id,
        expense: { id: activity.expense_id, group_id: activity.group_id },
      });
    } else if (activity.group_id) {
      // Expense deleted or group activity - navigate to group
      navigation.navigate('GroupDetail', { groupId: activity.group_id });
    }
    // If group is also deleted (no group_id), do nothing
  };

  const renderActivity = ({ item: activity }) => (
    <TouchableOpacity
      onPress={() => handleActivityPress(activity)}
      activeOpacity={0.7}
    >
      <CardGlass style={styles.activityCard}>
        <View style={[styles.activityIconContainer, getActivityIconBgStyle(activity)]}>
          {getActivityIcon(activity)}
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>
              {getActivityDescription(activity)}
            </Text>
          </View>
          <Text style={styles.activityTime}>
            {formatActivityDate(activity.created_at)}
          </Text>
        </View>
      </CardGlass>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <CardGlass style={styles.emptyCard}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name={hasActiveFilters ? 'search-outline' : 'pulse-outline'}
            size={48}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {hasActiveFilters ? 'No matching activities' : 'No activities yet'}
        </Text>
        <Text style={styles.emptyText}>
          {hasActiveFilters
            ? 'Try adjusting your filters'
            : 'Activities will appear here as you use the app'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </CardGlass>
    );
  };

  const renderFooter = () => {
    if (!hasMore || isLoading) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (isLoading && activities.length === 0) {
    return <Loader fullScreen />;
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>All Activity</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search and filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
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

        {/* Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeFilter}
          contentContainerStyle={styles.typeFilterContent}
          keyboardShouldPersistTaps="handled"
        >
          {ACTIVITY_TYPES.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typePill, selectedType === type.key && styles.typePillActive]}
              onPress={() => setSelectedType(type.key)}
            >
              <Text style={[styles.typePillText, selectedType === type.key && styles.typePillTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.typePill, styles.filterPill, selectedGroupId && styles.typePillActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={selectedGroupId ? colors.textPrimary : colors.textMuted}
            />
            <Text style={[styles.typePillText, selectedGroupId && styles.typePillTextActive]}>
              {selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name || 'Group' : 'Group'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Range Filter */}
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={[styles.datePill, fromDate && styles.datePillActive]}
            onPress={() => setShowDatePicker('from')}
          >
            <Ionicons name="calendar-outline" size={14} color={fromDate ? colors.textPrimary : colors.textMuted} />
            <Text style={[styles.datePillText, fromDate && styles.datePillTextActive]}>
              {fromDate ? formatDateShort(fromDate) : 'From'}
            </Text>
            {fromDate && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setFromDate(null); }}>
                <Ionicons name="close" size={14} color={colors.textPrimary} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} style={styles.dateArrowIcon} />

          <TouchableOpacity
            style={[styles.datePill, toDate && styles.datePillActive]}
            onPress={() => setShowDatePicker('to')}
          >
            <Ionicons name="calendar-outline" size={14} color={toDate ? colors.textPrimary : colors.textMuted} />
            <Text style={[styles.datePillText, toDate && styles.datePillTextActive]}>
              {toDate ? formatDateShort(toDate) : 'To'}
            </Text>
            {toDate && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setToDate(null); }}>
                <Ionicons name="close" size={14} color={colors.textPrimary} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.resultsCount}>
          {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      <FlatList
        data={filteredActivities}
        renderItem={renderActivity}
        keyExtractor={item => `activity-${item.id}`}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Group Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Group</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.groupList}>
              <TouchableOpacity
                style={[styles.groupOption, !selectedGroupId && styles.groupOptionActive]}
                onPress={() => handleGroupFilterChange(null)}
              >
                <View style={styles.groupOptionAllIcon}>
                  <Ionicons name="globe-outline" size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.groupOptionText, !selectedGroupId && styles.groupOptionTextActive]}>
                  All Groups
                </Text>
                {!selectedGroupId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>

              {groups.map(group => (
                <TouchableOpacity
                  key={group.id}
                  style={[styles.groupOption, selectedGroupId === group.id && styles.groupOptionActive]}
                  onPress={() => handleGroupFilterChange(group.id)}
                >
                  <View style={styles.groupOptionIconContainer}>
                    <Text style={styles.groupOptionIconText}>
                      {group.name?.charAt(0).toUpperCase() || 'G'}
                    </Text>
                  </View>
                  <Text style={[styles.groupOptionText, selectedGroupId === group.id && styles.groupOptionTextActive]}>
                    {group.name}
                  </Text>
                  {selectedGroupId === group.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  typeFilter: {
    marginBottom: spacing.sm,
  },
  typeFilterContent: {
    gap: spacing.sm,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: spacing.sm,
  },
  typePillActive: {
    backgroundColor: colors.primary,
  },
  typePillText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  typePillTextActive: {
    color: colors.textPrimary,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.xs,
  },
  datePillActive: {
    backgroundColor: colors.primary,
  },
  datePillText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  datePillTextActive: {
    color: colors.textPrimary,
  },
  dateArrowIcon: {
    marginHorizontal: spacing.sm,
  },
  clearFilters: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  clearFiltersBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  groupList: {
    padding: spacing.lg,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  groupOptionActive: {
    backgroundColor: 'rgba(50, 130, 184, 0.2)',
  },
  groupOptionAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupOptionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupOptionIconText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  groupOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  groupOptionTextActive: {
    fontWeight: '600',
  },
});

export default ActivityScreen;
