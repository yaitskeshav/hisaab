import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
  Dimensions,
  TextInput,
  Animated,
  LayoutAnimation,
  UIManager,
  Image,
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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import IconButton from '../../components/common/IconButton';
import SectionContainer from '../../components/common/SectionContainer';
import Loader from '../../components/common/Loader';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import useGroupStore from '../../store/groupStore';
import useExpenseStore from '../../store/expenseStore';
import useAuthStore from '../../store/authStore';
import { getCategoryIcon } from '../../constants/categories';
import { formatCurrency } from '../../utils/currency';
import apiClient, { BASE_URL } from '../../api/client';
import InviteModal from '../../components/InviteModal';

const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { currentGroup, fetchGroupDetails, isLoading: groupLoading } = useGroupStore();
  const { expenses, fetchGroupExpenses, deleteExpense, isLoading: expensesLoading } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const { user } = useAuthStore();

  // Collapsible sections
  const [showMembers, setShowMembers] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

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

  const handleShareInvite = () => {
    setShareModalVisible(true);
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
            tintColor={colors.primary}
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
          <Text style={styles.title} numberOfLines={1}>
            {currentGroup?.name || 'Group'}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShareInvite}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {/* Group Info */}
        <CardGlass style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Members</Text>
              <Text style={styles.infoValue}>{currentGroup?.members?.length || 0}</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Expenses</Text>
              <Text style={styles.infoValue}>{expenses.length}</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total</Text>
              <Text style={styles.infoValue}>{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, styles.infoRowSecond]}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>You Paid</Text>
              <Text style={styles.infoValue}>{formatCurrency(amountIPaid)}</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{amountIOweToGet > 0 ? 'You Get' : 'You Owe'}</Text>
              <Text style={[
                styles.infoValue,
                amountIOweToGet > 0 ? styles.balanceOwed : styles.balanceOwe
              ]}>
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
              icon={<Ionicons name="wallet-outline" size={20} color={colors.primary} />}
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
            <Text style={styles.collapsibleTitle}>Members</Text>
            <View style={styles.collapsibleBadge}>
              <Text style={styles.collapsibleBadgeText}>{currentGroup?.members?.length || 0}</Text>
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
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={[
                    styles.memberAvatar,
                    member.id === user?.id && styles.memberAvatarSelf
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
                      <Text style={styles.memberAvatarText}>
                        {member.name?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.name}
                      {member.id === user?.id && <Text style={styles.youBadge}> (You)</Text>}
                    </Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
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
                <Text style={styles.collapsibleTitle}>Payment Distribution</Text>
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
                    color: index === 0 ? colors.primary :
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
              style={styles.expenseSearchInput}
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
                  filterStatus === filter.key && styles.filterPillActive
                ]}
                onPress={() => setFilterStatus(filter.key)}
              >
                <Text style={[
                  styles.filterPillText,
                  filterStatus === filter.key && styles.filterPillTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Range Filter */}
          <View style={styles.dateFilterRow}>
            <TouchableOpacity
              style={[styles.datePill, fromDate && styles.datePillActive]}
              onPress={() => setShowDatePicker('from')}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={fromDate ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.datePillText, fromDate && styles.datePillTextActive]}>
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
              style={[styles.datePill, toDate && styles.datePillActive]}
              onPress={() => setShowDatePicker('to')}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={toDate ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.datePillText, toDate && styles.datePillTextActive]}>
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
                <Text style={styles.clearFiltersLink}>Clear filters</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.expenseCount}>
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
          </View>

          {expensesLoading ? (
            <Loader />
          ) : filteredExpenses.length === 0 ? (
            <CardGlass style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>{hasActiveFilters ? '🔍' : '📝'}</Text>
              <Text style={styles.emptyText}>
                {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Add your first expense to get started'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
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
                      expense.is_settled && styles.expenseIconSettled
                    ]}>
                      <Text style={styles.expenseIconText}>
                        {expense.is_settled ? '✓' : getCategoryIcon(expense.category_id || expense.category?.name)}
                      </Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle}>{expense.title}</Text>
                      <Text style={styles.expenseDate}>
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
                        expense.is_settled && styles.expenseAmountSettled
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
                    <Text style={styles.expenseMetaText}>
                      Paid by {expense.paid_by_id === user?.id ? 'you' : (expense.paid_by?.name || 'Someone')}
                    </Text>
                    <Text style={styles.expenseMetaDot}>•</Text>
                    <Text style={styles.expenseMetaText}>
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
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: spacing.md,
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
    borderTopColor: colors.cardBorder,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceOwe: {
    color: colors.error,
  },
  balanceOwed: {
    color: colors.success,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: colors.cardBorder,
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
    color: colors.textPrimary,
  },
  collapsibleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  collapsibleBadgeText: {
    fontSize: 12,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.textPrimary,
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
    backgroundColor: colors.primary,
  },
  datePillText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  datePillTextActive: {
    color: colors.textPrimary,
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
    color: colors.primary,
    fontWeight: '500',
  },
  expenseCount: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.glass,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expenseAmountText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  expenseAmountSettled: {
    color: colors.success || '#22c55e',
  },
  settledBadgeContainer: {
    marginTop: 4,
  },
  settledBadge: {
    fontSize: 10,
    color: colors.success || '#22c55e',
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
    color: colors.textMuted,
  },
  expenseMetaDot: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarSelf: {
    backgroundColor: colors.success || '#22c55e',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  youBadge: {
    fontSize: 13,
    color: colors.success || '#22c55e',
    fontWeight: '400',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.error || '#ef4444'}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
});

export default GroupDetailScreen;
