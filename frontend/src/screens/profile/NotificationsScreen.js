import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';

const NotificationsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    expenseAdded: true,
    expenseSettled: true,
    groupInvite: true,
    weeklyReport: false,
    emailNotifications: true,
    pushNotifications: true,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expense Added</Text>
              <Text style={styles.settingDesc}>Get notified when expense is added</Text>
            </View>
            <Switch
              value={settings.expenseAdded}
              onValueChange={() => toggleSetting('expenseAdded')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expense Settled</Text>
              <Text style={styles.settingDesc}>Get notified when expense is settled</Text>
            </View>
            <Switch
              value={settings.expenseSettled}
              onValueChange={() => toggleSetting('expenseSettled')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Group Invites</Text>
              <Text style={styles.settingDesc}>Get notified about group invitations</Text>
            </View>
            <Switch
              value={settings.groupInvite}
              onValueChange={() => toggleSetting('groupInvite')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Weekly Summary</Text>
              <Text style={styles.settingDesc}>Get weekly expense summary</Text>
            </View>
            <Switch
              value={settings.weeklyReport}
              onValueChange={() => toggleSetting('weeklyReport')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>

        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDesc}>Receive notifications via email</Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={() => toggleSetting('emailNotifications')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive push notifications</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => toggleSetting('pushNotifications')}
              trackColor={{ false: colors.textMuted, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </CardGlass>
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
});

export default NotificationsScreen;
