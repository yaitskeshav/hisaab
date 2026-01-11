import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import apiClient from '../../api/client';

const NotificationsScreen = ({ navigation }) => {
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
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }}>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Group Activity</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Member Joined</Text>
              <Text style={styles.settingDesc}>When someone joins your group</Text>
            </View>
            <Switch
              value={settings.notify_member_joined}
              onValueChange={() => toggleSetting('notify_member_joined')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expense Added</Text>
              <Text style={styles.settingDesc}>When an expense is added to your group</Text>
            </View>
            <Switch
              value={settings.notify_expense_added}
              onValueChange={() => toggleSetting('notify_expense_added')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expense Edited</Text>
              <Text style={styles.settingDesc}>When an expense is modified</Text>
            </View>
            <Switch
              value={settings.notify_expense_edited}
              onValueChange={() => toggleSetting('notify_expense_edited')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payment Received</Text>
              <Text style={styles.settingDesc}>When someone records a payment to you</Text>
            </View>
            <Switch
              value={settings.notify_settlement_created}
              onValueChange={() => toggleSetting('notify_settlement_created')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payment Confirmed</Text>
              <Text style={styles.settingDesc}>When your payment is confirmed</Text>
            </View>
            <Switch
              value={settings.notify_settlement_confirm}
              onValueChange={() => toggleSetting('notify_settlement_confirm')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>

        <Text style={styles.footerText}>
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
    color: colors.textPrimary,
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
    color: colors.textMuted,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});

export default NotificationsScreen;
