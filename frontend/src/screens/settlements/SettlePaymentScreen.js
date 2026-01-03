import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import IconButton from '../../components/common/IconButton';
import Toast from '../../components/common/Toast';
import useSettlementStore from '../../store/settlementStore';

const SettlePaymentScreen = ({ route, navigation }) => {
  const { groupId, groupName, debt } = route.params;
  const { createSettlement, isLoading } = useSettlementStore();

  const [amount, setAmount] = useState(debt.amount.toString());
  const [note, setNote] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [showSuccess, setShowSuccess] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getAvatarColor = (userId) => {
    const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return avatarColors[userId % avatarColors.length];
  };

  const handleAmountChange = (value) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
  };

  const handleSettle = async () => {
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount', type: 'error' });
      return;
    }

    if (amountNum > debt.amount) {
      setToast({ visible: true, message: `Amount cannot exceed ${formatCurrency(debt.amount)}`, type: 'error' });
      return;
    }

    const result = await createSettlement(groupId, debt.to_user_id, amountNum, note);

    if (result.success) {
      // Show success animation
      setShowSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Navigate back after delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } else {
      setToast({ visible: true, message: result.error || 'Failed to record payment', type: 'error' });
    }
  };

  const isFullPayment = parseFloat(amount) === debt.amount;
  const isPartialPayment = parseFloat(amount) > 0 && parseFloat(amount) < debt.amount;

  if (showSuccess) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundDark]}
        style={styles.container}
      >
        <View style={styles.successContainer}>
          <Animated.View style={[
            styles.successContent,
            { transform: [{ scale: successScale }] }
          ]}>
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.successIconGradient}
              >
                <Ionicons name="checkmark" size={56} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Payment Recorded!</Text>
            <Text style={styles.successSubtitle}>
              Waiting for {debt.to_user.name} to confirm
            </Text>
            <View style={styles.successDetails}>
              <Text style={styles.successAmount}>{formatCurrency(parseFloat(amount))}</Text>
              <Text style={styles.successTo}>to {debt.to_user.name}</Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        />
        <Text style={styles.headerTitle}>Record Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}>
            {/* Recipient Card */}
            <CardGlass style={styles.recipientCard} gradient>
              <Text style={styles.payingToLabel}>Paying to</Text>
              <View style={styles.recipientInfo}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(debt.to_user.id) }]}>
                  <Text style={styles.avatarText}>{getInitials(debt.to_user.name)}</Text>
                </View>
                <View style={styles.recipientDetails}>
                  <Text style={styles.recipientName}>{debt.to_user.name}</Text>
                  <Text style={styles.recipientEmail}>{debt.to_user.email}</Text>
                </View>
              </View>

              <View style={styles.totalOwedContainer}>
                <Text style={styles.totalOwedLabel}>Total amount you owe</Text>
                <Text style={styles.totalOwedAmount}>{formatCurrency(debt.amount)}</Text>
              </View>

              {debt.is_optimized ? (
                <View style={styles.optimizedNote}>
                  <Ionicons name="flash" size={14} color={colors.accent} />
                  <Text style={styles.optimizedNoteText}>
                    This payment was simplified to reduce transactions
                  </Text>
                </View>
              ) : null}
            </CardGlass>

            {/* Amount Input */}
            <CardGlass style={styles.amountCard}>
              <Text style={styles.amountLabel}>Payment Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Quick amount buttons */}
              <View style={styles.quickAmounts}>
                <TouchableOpacity
                  style={[styles.quickAmountButton, isFullPayment && styles.quickAmountButtonActive]}
                  onPress={() => setAmount(debt.amount.toString())}
                >
                  <Text style={[styles.quickAmountText, isFullPayment && styles.quickAmountTextActive]}>
                    Full ({formatCurrency(debt.amount)})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickAmountButton, amount === (debt.amount / 2).toFixed(2) && styles.quickAmountButtonActive]}
                  onPress={() => setAmount((debt.amount / 2).toFixed(2))}
                >
                  <Text style={[styles.quickAmountText, amount === (debt.amount / 2).toFixed(2) && styles.quickAmountTextActive]}>
                    Half ({formatCurrency(debt.amount / 2)})
                  </Text>
                </TouchableOpacity>
              </View>

              {isPartialPayment ? (
                <View style={styles.partialPaymentNote}>
                  <Ionicons name="information-circle" size={16} color={colors.info} />
                  <Text style={styles.partialPaymentText}>
                    Partial payment. {formatCurrency(debt.amount - parseFloat(amount))} will remain.
                  </Text>
                </View>
              ) : null}
            </CardGlass>

            {/* Note Input */}
            <CardGlass style={styles.noteCard}>
              <AppInput
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                placeholder="e.g., Paid via UPI, Cash, etc."
                multiline
                numberOfLines={2}
              />
            </CardGlass>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              <Text style={styles.infoText}>
                {debt.to_user.name} will need to confirm this payment before your balance is updated.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <AppButton
            title={`Record Payment of ${formatCurrency(parseFloat(amount) || 0)}`}
            onPress={handleSettle}
            loading={isLoading}
            disabled={!amount || parseFloat(amount) <= 0}
          />
        </View>
      </KeyboardAvoidingView>

      <Toast
        {...toast}
        onHide={() => setToast({ ...toast, visible: false })}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
  },
  closeButton: {},
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  recipientCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  payingToLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipientEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalOwedContainer: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  totalOwedLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  totalOwedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
  },
  optimizedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  optimizedNoteText: {
    fontSize: 12,
    color: colors.accent,
  },
  amountCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 100,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickAmountButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  quickAmountButtonActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  quickAmountText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: colors.primary,
  },
  partialPaymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.info + '15',
    padding: spacing.sm,
    borderRadius: 8,
  },
  partialPaymentText: {
    fontSize: 12,
    color: colors.info,
  },
  noteCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bottomContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successContent: {
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: spacing.xl,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  successDetails: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success,
  },
  successTo: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default SettlePaymentScreen;
