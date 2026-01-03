import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import IconButton from '../../components/common/IconButton';
import Loader from '../../components/common/Loader';
import Toast from '../../components/common/Toast';
import useSettlementStore from '../../store/settlementStore';
import useAuthStore from '../../store/authStore';

const SettleUpScreen = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const { balances, fetchGroupBalances, settlements, fetchGroupSettlements, cancelSettlement, isLoading } = useSettlementStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState('balances'); // 'balances' or 'history'
  const [cancellingId, setCancellingId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Animation values - start at 1 so content is visible immediately
  const [fadeAnim] = useState(new Animated.Value(1));

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchGroupBalances(groupId),
      fetchGroupSettlements(groupId),
    ]);
  }, [groupId, fetchGroupBalances, fetchGroupSettlements]);

  // Load data on initial mount
  useEffect(() => {
    const initialLoad = async () => {
      await loadData();
      setInitialLoading(false);
    };
    initialLoad();
  }, [groupId]);

  // Also refresh on focus (when coming back from other screens)
  useFocusEffect(
    useCallback(() => {
      // Don't reload on first focus since useEffect handles it
      if (!initialLoading) {
        loadData();
      }
    }, [loadData, initialLoading])
  );

  // Get pending settlements where current user is the payer (outgoing)
  const myPendingSettlements = settlements.filter(
    s => s.payer_id === user?.id && s.status === 'pending'
  );

  // Get pending settlements where current user is the receiver (incoming - needs confirmation)
  const incomingPendingSettlements = settlements.filter(
    s => s.receiver_id === user?.id && s.status === 'pending'
  );

  // Find pending settlement for a specific receiver (outgoing)
  const getPendingSettlement = (receiverId) => {
    return myPendingSettlements.find(s => s.receiver_id === receiverId);
  };

  // Find incoming pending settlement from a specific payer
  const getIncomingPendingSettlement = (payerId) => {
    return incomingPendingSettlements.find(s => s.payer_id === payerId);
  };

  const handleCancelSettlement = async (settlementId) => {
    setCancellingId(settlementId);
    const result = await cancelSettlement(settlementId);
    setCancellingId(null);

    if (result.success) {
      setToast({ visible: true, message: 'Payment cancelled', type: 'info' });
      loadData(); // Refresh data
    } else {
      setToast({ visible: true, message: result.error || 'Failed to cancel', type: 'error' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSettleDebt = (debt) => {
    navigation.navigate('SettlePayment', {
      groupId,
      groupName,
      debt,
    });
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getAvatarColor = (userId) => {
    const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return avatarColors[(userId || 0) % avatarColors.length];
  };

  // Get debts relevant to current user
  const myDebts = balances?.debts?.filter(d => d.from_user_id === user?.id) || [];
  const owedToMe = balances?.debts?.filter(d => d.to_user_id === user?.id) || [];
  const otherDebts = balances?.debts?.filter(d => d.from_user_id !== user?.id && d.to_user_id !== user?.id) || [];

  // My net balance
  const myBalance = balances?.balances?.find(b => b.user_id === user?.id);
  const isSettledUp = !myBalance || Math.abs(myBalance.net_amount) < 0.01;

  if (initialLoading || (isLoading && !refreshing && !balances)) {
    return <Loader fullScreen />;
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Settle Up</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
        <IconButton
          icon={activeTab === 'balances' ? 'time-outline' : 'wallet-outline'}
          onPress={() => setActiveTab(activeTab === 'balances' ? 'history' : 'balances')}
          style={[styles.historyButton, activeTab === 'history' && styles.activeTabButton]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {activeTab === 'balances' ? (
            <>
              {/* Summary Card */}
              <CardGlass style={styles.summaryCard} gradient>
                <View style={styles.summaryHeader}>
                  <View style={[styles.statusBadge, isSettledUp ? styles.settledBadge : styles.unsettledBadge]}>
                    <Ionicons
                      name={isSettledUp ? 'checkmark-circle' : 'alert-circle'}
                      size={16}
                      color={isSettledUp ? colors.success : colors.warning}
                    />
                    <Text style={[styles.statusText, isSettledUp ? styles.settledText : styles.unsettledText]}>
                      {isSettledUp ? 'All Settled Up!' : 'Pending Settlements'}
                    </Text>
                  </View>
                </View>

                {myBalance && Math.abs(myBalance.net_amount) >= 0.01 ? (
                  <View style={styles.myBalanceContainer}>
                    <Text style={styles.myBalanceLabel}>Your Balance</Text>
                    <Text style={[
                      styles.myBalanceAmount,
                      myBalance.net_amount > 0 ? styles.positiveAmount : styles.negativeAmount
                    ]}>
                      {myBalance.net_amount > 0 ? '+' : ''}{formatCurrency(myBalance.net_amount)}
                    </Text>
                    <Text style={styles.myBalanceHint}>
                      {myBalance.net_amount > 0 ? 'Others owe you' : 'You owe others'}
                    </Text>
                  </View>
                ) : null}

                {balances?.settlements_saved > 0 ? (
                  <View style={styles.optimizedBadge}>
                    <Ionicons name="flash" size={14} color={colors.accent} />
                    <Text style={styles.optimizedText}>
                      Simplified! Saved {balances.settlements_saved} payment{balances.settlements_saved > 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : null}
              </CardGlass>

              {/* Debts I Owe */}
              {myDebts.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>You Owe</Text>
                  {myDebts.map((debt, index) => {
                    const pendingSettlement = getPendingSettlement(debt.to_user_id);
                    return (
                      <DebtCard
                        key={`owe-${index}`}
                        debt={debt}
                        type="owe"
                        onSettle={() => handleSettleDebt(debt)}
                        onCancelPending={() => handleCancelSettlement(pendingSettlement?.id)}
                        pendingSettlement={pendingSettlement}
                        isCancelling={cancellingId === pendingSettlement?.id}
                        formatCurrency={formatCurrency}
                        getInitials={getInitials}
                        getAvatarColor={getAvatarColor}
                        isOptimized={debt.is_optimized}
                      />
                    );
                  })}
                </View>
              ) : null}

              {/* Debts Owed to Me */}
              {owedToMe.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Owed to You</Text>
                  {owedToMe.map((debt, index) => {
                    const incomingSettlement = getIncomingPendingSettlement(debt.from_user_id);
                    return (
                      <DebtCard
                        key={`get-${index}`}
                        debt={debt}
                        type="get"
                        incomingSettlement={incomingSettlement}
                        onConfirmIncoming={() => navigation.navigate('PendingSettlements')}
                        formatCurrency={formatCurrency}
                        getInitials={getInitials}
                        getAvatarColor={getAvatarColor}
                        isOptimized={debt.is_optimized}
                      />
                    );
                  })}
                </View>
              ) : null}

              {/* Other Debts */}
              {otherDebts.length > 0 ? (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => { }}
                  >
                    <Text style={styles.sectionTitleMuted}>Other Settlements</Text>
                    <Text style={styles.sectionCount}>{otherDebts.length}</Text>
                  </TouchableOpacity>
                  {otherDebts.map((debt, index) => (
                    <DebtCard
                      key={`other-${index}`}
                      debt={debt}
                      type="other"
                      formatCurrency={formatCurrency}
                      getInitials={getInitials}
                      getAvatarColor={getAvatarColor}
                      isOptimized={debt.is_optimized}
                      compact
                    />
                  ))}
                </View>
              ) : null}

              {/* All settled state */}
              {isSettledUp && myDebts.length === 0 && owedToMe.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.emptyIconGradient}
                    >
                      <Ionicons name="checkmark-done" size={40} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.emptyTitle}>All Settled!</Text>
                  <Text style={styles.emptyText}>
                    Everyone in this group is squared up. No pending payments.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            /* History Tab */
            <View style={styles.historyContainer}>
              <Text style={styles.sectionTitle}>Settlement History</Text>
              {settlements.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyHistoryText}>No settlements yet</Text>
                </View>
              ) : (
                settlements.map((settlement) => (
                  <SettlementHistoryCard
                    key={settlement.id}
                    settlement={settlement}
                    currentUserId={user?.id}
                    formatCurrency={formatCurrency}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                  />
                ))
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Toast
        {...toast}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </LinearGradient>
  );
};

// Debt Card Component
const DebtCard = ({
  debt,
  type,
  onSettle,
  onCancelPending,
  pendingSettlement,
  incomingSettlement,
  onConfirmIncoming,
  isCancelling,
  formatCurrency,
  getInitials,
  getAvatarColor,
  isOptimized,
  compact
}) => {
  const person = type === 'owe' ? debt.to_user : debt.from_user;
  const showSettleButton = type === 'owe';
  const hasPending = !!pendingSettlement;
  const hasIncoming = !!incomingSettlement;

  if (!person) return null;

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <CardGlass style={[styles.debtCard, compact && styles.debtCardCompact, hasPending && styles.debtCardPending, hasIncoming && styles.debtCardIncoming]}>
      <View style={styles.debtContent}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(person.id) }]}>
          <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
        </View>

        <View style={styles.debtInfo}>
          <View style={styles.debtNameRow}>
            <Text style={styles.debtName}>{person.name || 'Unknown'}</Text>
            {isOptimized ? (
              <View style={styles.optimizedTag}>
                <Ionicons name="flash" size={10} color={colors.accent} />
                <Text style={styles.optimizedTagText}>Simplified</Text>
              </View>
            ) : null}
          </View>
          {type === 'other' ? (
            <Text style={styles.debtDescription}>
              {debt.from_user?.name || 'Unknown'} → {debt.to_user?.name || 'Unknown'}
            </Text>
          ) : (
            <Text style={styles.debtDescription}>
              {type === 'owe' ? 'You owe' : 'Owes you'}
            </Text>
          )}
        </View>

        <View style={styles.debtAmountContainer}>
          <Text style={[
            styles.debtAmount,
            type === 'owe' ? styles.negativeAmount : (type === 'get' ? styles.positiveAmount : styles.neutralAmount)
          ]}>
            {formatCurrency(debt.amount)}
          </Text>
          {showSettleButton && !hasPending ? (
            <TouchableOpacity style={styles.settleButton} onPress={onSettle}>
              <Text style={styles.settleButtonText}>Settle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Pending Settlement Banner (outgoing - waiting for their confirmation) */}
      {hasPending ? (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerLeft}>
            <View style={styles.pendingIconWrapper}>
              <Ionicons name="time" size={16} color="#F97316" />
            </View>
            <View style={styles.pendingBannerInfo}>
              <Text style={styles.pendingBannerTitle}>
                Payment of {formatCurrency(pendingSettlement.amount)} recorded
              </Text>
              <Text style={styles.pendingBannerSubtitle}>
                Waiting for {person.name} to confirm • {formatTimeAgo(pendingSettlement.created_at)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cancelPendingButton}
            onPress={onCancelPending}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader size="small" />
            ) : (
              <Ionicons name="close" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Incoming Settlement Banner (needs your confirmation) */}
      {hasIncoming ? (
        <TouchableOpacity style={styles.incomingBanner} onPress={onConfirmIncoming} activeOpacity={0.8}>
          <View style={styles.pendingBannerLeft}>
            <View style={styles.incomingIconWrapper}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            </View>
            <View style={styles.pendingBannerInfo}>
              <Text style={styles.incomingBannerTitle}>
                {person.name} recorded {formatCurrency(incomingSettlement.amount)}
              </Text>
              <Text style={styles.pendingBannerSubtitle}>
                Tap to confirm you received this payment
              </Text>
            </View>
          </View>
          <View style={styles.confirmArrow}>
            <Ionicons name="chevron-forward" size={18} color="#10B981" />
          </View>
        </TouchableOpacity>
      ) : null}
    </CardGlass>
  );
};

// Settlement History Card
const SettlementHistoryCard = ({ settlement, currentUserId, formatCurrency, getInitials, getAvatarColor }) => {
  const isPayer = settlement.payer_id === currentUserId;
  const otherPerson = isPayer ? settlement.receiver : settlement.payer;

  if (!otherPerson) return null;

  const getStatusColor = () => {
    switch (settlement.status) {
      case 'confirmed': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  const getStatusIcon = () => {
    switch (settlement.status) {
      case 'confirmed': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'time';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <CardGlass style={styles.historyCard}>
      <View style={styles.historyContent}>
        <View style={[styles.avatar, styles.avatarSmall, { backgroundColor: getAvatarColor(otherPerson.id) }]}>
          <Text style={styles.avatarTextSmall}>{getInitials(otherPerson.name)}</Text>
        </View>

        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle}>
            {isPayer ? `You paid ${otherPerson.name || 'Unknown'}` : `${otherPerson.name || 'Unknown'} paid you`}
          </Text>
          <Text style={styles.historyDate}>{formatDate(settlement.created_at)}</Text>
          {settlement.note ? (
            <Text style={styles.historyNote}>"{settlement.note}"</Text>
          ) : null}
        </View>

        <View style={styles.historyRight}>
          <Text style={[styles.historyAmount, isPayer ? styles.negativeAmount : styles.positiveAmount]}>
            {isPayer ? '-' : '+'}{formatCurrency(settlement.amount)}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: `${getStatusColor()}20` }]}>
            <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
            <Text style={[styles.statusChipText, { color: getStatusColor() }]}>
              {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </CardGlass>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyButton: {
    marginLeft: spacing.sm,
  },
  activeTabButton: {
    backgroundColor: colors.primary + '30',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  settledBadge: {
    backgroundColor: colors.success + '20',
  },
  unsettledBadge: {
    backgroundColor: colors.warning + '20',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settledText: {
    color: colors.success,
  },
  unsettledText: {
    color: colors.warning,
  },
  myBalanceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  myBalanceLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  myBalanceAmount: {
    fontSize: 36,
    fontWeight: '700',
  },
  myBalanceHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  neutralAmount: {
    color: colors.textPrimary,
  },
  optimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent + '15',
    borderRadius: 12,
    alignSelf: 'center',
  },
  optimizedText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  debtCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  debtCardCompact: {
    padding: spacing.sm,
  },
  debtCardPending: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderWidth: 1,
  },
  debtCardIncoming: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  debtContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  avatarTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  debtInfo: {
    flex: 1,
  },
  debtNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  debtName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  debtDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  optimizedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  optimizedTagText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '500',
  },
  debtAmountContainer: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  settleButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  historyContainer: {
    flex: 1,
  },
  historyCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  // Pending settlement banner styles
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 115, 22, 0.2)',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  pendingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pendingBannerInfo: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },
  pendingBannerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cancelPendingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  // Incoming settlement banner styles
  incomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  incomingIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  incomingBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  confirmArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});

export default SettleUpScreen;
