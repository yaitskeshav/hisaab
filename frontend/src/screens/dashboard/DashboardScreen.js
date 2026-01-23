import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import SectionContainer from '../../components/common/SectionContainer';
import useGroupStore from '../../store/groupStore';
import useAuthStore from '../../store/authStore';
import useActivityStore from '../../store/activityStore';
import useSettlementStore from '../../store/settlementStore';
import { useAccentColor } from '../../store/themeStore';
import { getCategoryIcon } from '../../constants/categories';
import { PREDEFINED_GROUP_ICONS } from '../../constants/groupIcons';
import { BASE_URL } from '../../api/client';
import { formatCurrency } from '../../utils/currency';

const MAX_DASHBOARD_ACTIVITIES = 5;

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

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const accent = useAccentColor();
  const { groups, fetchGroups } = useGroupStore();
  const { activities, fetchActivities } = useActivityStore();
  const { pendingSettlements, fetchPendingSettlements, userTotalBalances, fetchUserTotalBalances } = useSettlementStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchGroups(),
      fetchActivities(1, MAX_DASHBOARD_ACTIVITIES),
      fetchPendingSettlements(),
      fetchUserTotalBalances(),
    ]);
  }, [fetchGroups, fetchActivities, fetchPendingSettlements, fetchUserTotalBalances]);

  // Load data on initial mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (returning from other screens)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Sort groups by most recent activity - memoized for stable reference
  const sortedGroups = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return [...groups].sort((a, b) => {
      const aDate = getGroupLastActivity(a);
      const bDate = getGroupLastActivity(b);
      return bDate - aDate; // Most recent first
    });
  }, [groups]);

  // Memoize displayed activities for stable reference
  const displayedActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    return activities.slice(0, MAX_DASHBOARD_ACTIVITIES);
  }, [activities]);

  // Memoize user balances to prevent unnecessary re-renders
  const balanceData = useMemo(() => ({
    totalSpent: userTotalBalances?.total_spent || 0,
    netBalance: userTotalBalances?.net_balance || 0,
  }), [userTotalBalances?.total_spent, userTotalBalances?.net_balance]);

  // Memoize pending count
  const pendingCount = useMemo(() => pendingSettlements?.length || 0, [pendingSettlements?.length]);

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
      month: 'short'
    });
  };

  const getActivityIcon = (activity) => {
    // Show category icon for expense activities
    if (['expense_added', 'expense_edited'].includes(activity.type) && activity.category_id) {
      return <Text style={{ fontSize: 20 }}>{getCategoryIcon(activity.category_id)}</Text>;
    }

    switch (activity.type) {
      case 'group_created':
        return <Ionicons name="add-circle" size={20} color={colors.success || '#22c55e'} />;
      case 'group_renamed':
        return <Ionicons name="create-outline" size={20} color={accent.primary} />;
      case 'member_joined':
        return <Ionicons name="person-add" size={20} color={colors.success || '#22c55e'} />;
      case 'member_left':
        return <Ionicons name="exit-outline" size={20} color={colors.warning || '#f59e0b'} />;
      case 'expense_added':
        return <Ionicons name="add" size={20} color={accent.primary} />;
      case 'expense_edited':
        return <Ionicons name="create-outline" size={20} color={accent.primary} />;
      case 'expense_deleted':
        return <Ionicons name="trash-outline" size={20} color={colors.error || '#ef4444'} />;
      case 'expense_settled':
        return <Ionicons name="checkmark-circle" size={20} color={colors.success || '#22c55e'} />;
      case 'expense_unsettled':
        return <Ionicons name="close-circle" size={20} color={colors.warning || '#f59e0b'} />;
      // Settlement activities
      case 'settlement_created':
        return <Ionicons name="cash-outline" size={20} color="#F97316" />;
      case 'settlement_confirmed':
        return <Ionicons name="checkmark-done-circle" size={20} color={colors.success || '#22c55e'} />;
      case 'settlement_rejected':
        return <Ionicons name="close-circle-outline" size={20} color={colors.error || '#ef4444'} />;
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
        return `${userName} renamed group`;
      case 'member_joined':
        return `${userName} joined ${groupName}`;
      case 'member_left':
        return `${userName} left ${groupName}`;
      case 'expense_added':
        const amtStr = activity.amount ? ` of ${formatCurrency(activity.amount)}` : '';
        return `${userName} added "${activity.expense_title || 'expense'}"${amtStr}`;
      case 'expense_edited':
        // Parse description for specific changes (pipe-separated)
        if (activity.description) {
          const parts = activity.description.split('|');
          for (const part of parts) {
            if (part.startsWith('amount_changed:')) {
              const vals = part.split(':');
              if (vals.length === 3) {
                return `${userName} changed amount ${formatCurrency(vals[1])} → ${formatCurrency(vals[2])}`;
              }
            } else if (part.startsWith('category_changed:')) {
              const vals = part.split(':');
              if (vals.length === 3) {
                return `${userName} changed category`;
              }
            }
          }
        }
        return `${userName} edited expense in ${groupName}`;
      case 'expense_deleted':
        const delAmtStr = activity.amount ? ` of ${formatCurrency(activity.amount)}` : '';
        return `${userName} deleted "${activity.expense_title || 'expense'}"${delAmtStr} from ${groupName}`;
      case 'expense_settled':
        return `${userName} settled expense in ${groupName}`;
      case 'expense_unsettled':
        return `${userName} unsettled expense in ${groupName}`;
      // Settlement activities
      case 'settlement_created':
        const settleAmtStr = activity.amount ? formatCurrency(activity.amount) : 'payment';
        return activity.description || `${userName} recorded a ${settleAmtStr} payment`;
      case 'settlement_confirmed':
        return activity.description || `${userName} confirmed a payment`;
      case 'settlement_rejected':
        return activity.description || `${userName} rejected a payment`;
      default:
        return activity.description || 'Activity';
    }
  };

  const getActivityIconBgStyle = (activity) => {
    switch (activity.type) {
      case 'expense_deleted':
      case 'settlement_rejected':
        return styles.activityIconDeleted;
      case 'expense_settled':
      case 'group_created':
      case 'member_joined':
      case 'settlement_confirmed':
        return styles.activityIconSettled;
      case 'member_left':
      case 'expense_unsettled':
        return styles.activityIconWarning;
      case 'settlement_created':
        return styles.activityIconSettlementPending;
      default:
        return {};
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.avatar_url ? (
              <Image
                source={{
                  uri: user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${BASE_URL}${user.avatar_url}`
                }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Overview - Simplified */}
        <CardGlass style={styles.overviewCard} gradient>
          <View style={styles.overviewMain}>
            {/* Total Spent */}
            <View style={styles.overviewSpent}>
              <Text style={styles.overviewSpentLabel}>Total Spent</Text>
              <Text
                style={styles.overviewSpentAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {formatCurrency(balanceData.totalSpent)}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.overviewDivider} />

            {/* Net Balance */}
            <View style={styles.overviewBalance}>
              {(() => {
                const netBalance = balanceData.netBalance;
                const isPositive = netBalance > 0;
                const isNegative = netBalance < 0;
                const isSettled = Math.abs(netBalance) < 0.01;

                return (
                  <>
                    <View style={[
                      styles.overviewBalanceIcon,
                      isPositive && styles.overviewBalanceIconPositive,
                      isNegative && styles.overviewBalanceIconNegative,
                      isSettled && styles.overviewBalanceIconSettled,
                    ]}>
                      <Ionicons
                        name={isSettled ? 'checkmark-circle' : (isPositive ? 'arrow-down' : 'arrow-up')}
                        size={20}
                        color={isSettled ? '#10B981' : (isPositive ? '#10B981' : '#EF4444')}
                      />
                    </View>
                    <View style={styles.overviewBalanceText}>
                      <Text style={styles.overviewBalanceLabel} numberOfLines={1}>
                        {isSettled ? 'All Settled' : (isPositive ? 'You get' : 'You owe')}
                      </Text>
                      <Text
                        style={[
                          styles.overviewBalanceAmount,
                          isPositive && styles.overviewBalancePositive,
                          isNegative && styles.overviewBalanceNegative,
                          isSettled && styles.overviewBalanceSettled,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                      >
                        {isSettled ? '₹0' : formatCurrency(Math.abs(netBalance))}
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          </View>

          {/* Groups count badge - clickable */}
          <TouchableOpacity
            style={styles.overviewGroupsBadge}
            onPress={() => navigation.navigate('Groups')}
            activeOpacity={0.7}
          >
            <View style={styles.overviewGroupsLeft}>
              <Ionicons name="people" size={14} color={colors.textMuted} />
              <Text style={styles.overviewGroupsText}>{groups.length} group{groups.length !== 1 ? 's' : ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </CardGlass>

        {/* Pending Settlements Alert */}
        {pendingCount > 0 ? (
          <TouchableOpacity
            style={styles.pendingCard}
            onPress={() => navigation.navigate('PendingSettlements')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.15)', 'rgba(234, 88, 12, 0.1)']}
              style={styles.pendingCardGradient}
            >
              <View style={styles.pendingIconContainer}>
                <Ionicons name="time" size={24} color="#F97316" />
              </View>
              <View style={styles.pendingContent}>
                <Text style={styles.pendingTitle}>
                  {pendingCount} Payment{pendingCount > 1 ? 's' : ''} Awaiting Confirmation
                </Text>
                <Text style={styles.pendingSubtitle}>
                  Tap to review and confirm
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F97316" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* Recent Groups */}
        <SectionContainer
          title="Recent Groups"
          rightAction={
            sortedGroups.length > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
                <Text style={[styles.seeAll, { color: accent.primary }]}>View All</Text>
              </TouchableOpacity>
            ) : null
          }
        >
          {sortedGroups.length === 0 ? (
            <CardGlass style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>
                Create or join a group to start tracking expenses
              </Text>
            </CardGlass>
          ) : (
            sortedGroups.slice(0, 3).map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
              >
                <CardGlass style={styles.groupCard}>
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
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </CardGlass>
              </TouchableOpacity>
            ))
          )}
        </SectionContainer>

        {/* Recent Activity */}
        <SectionContainer
          title="Recent Activity"
          rightAction={
            activities.length > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
                <Text style={[styles.seeAll, { color: accent.primary }]}>View All</Text>
              </TouchableOpacity>
            ) : null
          }
        >
          {displayedActivities.length === 0 ? (
            <CardGlass style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pulse-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No recent activity</Text>
              <Text style={styles.emptyText}>
                Your activities will appear here
              </Text>
            </CardGlass>
          ) : (
            <>
              {displayedActivities.map((activity, index) => (
                <TouchableOpacity
                  key={`activity-${activity.id}`}
                  onPress={() => {
                    const isExpenseActivity = ['expense_added', 'expense_edited', 'expense_settled', 'expense_unsettled'].includes(activity.type);
                    if (isExpenseActivity && activity.expense_id) {
                      navigation.navigate('AddExpense', {
                        groupId: activity.group_id,
                        expense: { id: activity.expense_id, group_id: activity.group_id },
                      });
                    } else if (activity.group_id) {
                      navigation.navigate('GroupDetail', { groupId: activity.group_id });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <CardGlass style={[
                    styles.activityCard,
                    index === displayedActivities.length - 1 && styles.activityCardLast
                  ]}>
                    <View style={[
                      styles.activityIconContainer,
                      getActivityIconBgStyle(activity)
                    ]}>
                      {getActivityIcon(activity)}
                    </View>
                    <View style={styles.activityContent}>
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityTitle}>
                          {activity.expense_title || activity.new_value || activity.group_name || 'Activity'}
                        </Text>
                        <Text style={styles.activityTime}>
                          {formatActivityDate(activity.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.activityDescription}>
                        {getActivityDescription(activity)}
                      </Text>
                    </View>
                  </CardGlass>
                </TouchableOpacity>
              ))}
            </>
          )}
        </SectionContainer>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    overflow: 'scroll',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 16,
    color: colors.textMuted,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  // Overview Card Styles
  overviewCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  overviewMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewSpent: {
    flex: 1,
    minWidth: 0,
  },
  overviewSpentLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewSpentAmount: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overviewDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: spacing.md,
  },
  overviewBalance: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewBalanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  overviewBalanceIconPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  overviewBalanceIconNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  overviewBalanceIconSettled: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  overviewBalanceText: {
    flex: 1,
    minWidth: 0,
  },
  overviewBalanceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  overviewBalanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overviewBalancePositive: {
    color: '#10B981',
  },
  overviewBalanceNegative: {
    color: '#EF4444',
  },
  overviewBalanceSettled: {
    color: '#10B981',
  },
  overviewGroupsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewGroupsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  overviewGroupsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  pendingCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pendingCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  pendingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F97316',
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupIconText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  groupIconImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  groupIconEmoji: {
    fontSize: 22,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 12,
    color: colors.textMuted,
  },
  groupSeparator: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  groupExpenses: {
    fontSize: 12,
    color: colors.textMuted,
  },
  groupTotal: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityCardLast: {
    marginBottom: 0,
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
  activityIconSettled: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  activityIconDeleted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  activityIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  activityIconSettlementPending: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activityDescription: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default DashboardScreen;
