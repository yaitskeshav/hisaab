import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import IconButton from '../../components/common/IconButton';
import Loader from '../../components/common/Loader';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import useSettlementStore from '../../store/settlementStore';

const PendingSettlementsScreen = ({ navigation }) => {
  const { pendingSettlements, fetchPendingSettlements, confirmSettlement, rejectSettlement, fetchUserTotalBalances, isLoading } = useSettlementStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  const loadData = async () => {
    await fetchPendingSettlements();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirm = async (settlement) => {
    setProcessingId(settlement.id);
    const result = await confirmSettlement(settlement.id);
    setProcessingId(null);

    if (result.success) {
      // Refresh user total balances for dashboard
      fetchUserTotalBalances();
      setToast({ visible: true, message: 'Payment confirmed!', type: 'success' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to confirm', type: 'error' });
    }
  };

  const handleReject = (settlement) => {
    setSelectedSettlement(settlement);
    setShowRejectModal(true);
  };

  const performReject = async () => {
    if (!selectedSettlement) return;

    setShowRejectModal(false);
    setProcessingId(selectedSettlement.id);
    const result = await rejectSettlement(selectedSettlement.id);
    setProcessingId(null);
    setSelectedSettlement(null);

    if (result.success) {
      setToast({ visible: true, message: 'Payment rejected', type: 'info' });
    } else {
      setToast({ visible: true, message: result.error || 'Failed to reject', type: 'error' });
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getAvatarColor = (userId) => {
    const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return avatarColors[userId % avatarColors.length];
  };

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

  if (isLoading && !refreshing && pendingSettlements.length === 0) {
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
          <Text style={styles.headerTitle}>Pending Confirmations</Text>
          {pendingSettlements.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingSettlements.length}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: 40 }} />
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
          {pendingSettlements.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.emptyIconGradient}
                >
                  <Ionicons name="checkmark-done" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>
                No payments waiting for your confirmation.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.infoText}>
                Review and confirm payments that others have recorded to you.
              </Text>

              {pendingSettlements.map((settlement) => (
                <SettlementCard
                  key={settlement.id}
                  settlement={settlement}
                  onConfirm={() => handleConfirm(settlement)}
                  onReject={() => handleReject(settlement)}
                  formatCurrency={formatCurrency}
                  getInitials={getInitials}
                  getAvatarColor={getAvatarColor}
                  formatTimeAgo={formatTimeAgo}
                  isProcessing={processingId === settlement.id}
                />
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        visible={showRejectModal}
        title="Reject Payment?"
        message={`Are you sure you want to reject the payment of ${selectedSettlement ? formatCurrency(selectedSettlement.amount) : ''} from ${selectedSettlement?.payer?.name}? They will be notified.`}
        confirmText="Reject"
        confirmColor={colors.error}
        onConfirm={performReject}
        onCancel={() => {
          setShowRejectModal(false);
          setSelectedSettlement(null);
        }}
      />

      <Toast
        {...toast}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </LinearGradient>
  );
};

const SettlementCard = ({
  settlement,
  onConfirm,
  onReject,
  formatCurrency,
  getInitials,
  getAvatarColor,
  formatTimeAgo,
  isProcessing,
}) => {
  return (
    <CardGlass style={styles.settlementCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(settlement.payer.id) }]}>
          <Text style={styles.avatarText}>{getInitials(settlement.payer.name)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.payerName}>{settlement.payer.name}</Text>
          <Text style={styles.groupName}>in {settlement.group?.name || 'Group'}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatCurrency(settlement.amount)}</Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(settlement.created_at)}</Text>
        </View>
      </View>

      {settlement.note ? (
        <View style={styles.noteContainer}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
          <Text style={styles.noteText}>"{settlement.note}"</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={onReject}
          disabled={isProcessing}
        >
          <Ionicons name="close" size={20} color={colors.error} />
          <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, styles.confirmButtonText]}>Confirm</Text>
            </>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  settlementCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
  },
  payerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  groupName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  rejectButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: colors.error,
  },
  confirmButtonText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
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
});

export default PendingSettlementsScreen;
