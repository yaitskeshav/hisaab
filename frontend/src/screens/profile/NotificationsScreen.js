import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import AnimatedToggle from '../../components/common/AnimatedToggle';
import apiClient from '../../api/client';
import { useAccentColor } from '../../store/themeStore';

const NotificationsScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const accent = useAccentColor();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    notify_member_joined: true,
    notify_expense_added: true,
    notify_expense_edited: true,
    notify_settlement_created: true,
    notify_settlement_confirm: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await apiClient.get('/notification-prefs');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key) => {
    const newValue = !settings[key];
    const prevSettings = { ...settings };

    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setSaving(true);

    try {
      await apiClient.put('/notification-prefs', { [key]: newValue });
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      // Revert on error
      setSettings(prevSettings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundDark]}
        style={styles.container}
      >
        <View style={styles.header}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
            variant="glass"
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          variant="glass"
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={{ width: 40 }}>
          {saving && <ActivityIndicator size="small" color={accent.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Group Activity</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Member Joined</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>When someone joins your group</Text>
            </View>
            <AnimatedToggle
              value={settings.notify_member_joined}
              onValueChange={() => toggleSetting('notify_member_joined')}
              activeColor={accent.primary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Expenses</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Expense Added</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>When an expense is added to your group</Text>
            </View>
            <AnimatedToggle
              value={settings.notify_expense_added}
              onValueChange={() => toggleSetting('notify_expense_added')}
              activeColor={accent.primary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Expense Edited</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>When an expense is modified</Text>
            </View>
            <AnimatedToggle
              value={settings.notify_expense_edited}
              onValueChange={() => toggleSetting('notify_expense_edited')}
              activeColor={accent.primary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Settlements</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Payment Received</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>When someone records a payment to you</Text>
            </View>
            <AnimatedToggle
              value={settings.notify_settlement_created}
              onValueChange={() => toggleSetting('notify_settlement_created')}
              activeColor={accent.primary}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Payment Confirmed</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>When your payment is confirmed</Text>
            </View>
            <AnimatedToggle
              value={settings.notify_settlement_confirm}
              onValueChange={() => toggleSetting('notify_settlement_confirm')}
              activeColor={accent.primary}
            />
          </View>
        </CardGlass>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Push notifications require the app to be installed and notification permissions enabled on your device.
        </Text>
      </ScrollView>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});

export default NotificationsScreen;
