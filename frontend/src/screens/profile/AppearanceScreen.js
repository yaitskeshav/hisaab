import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import AnimatedToggle from '../../components/common/AnimatedToggle';
import useThemeStore, { ACCENT_COLORS } from '../../store/themeStore';
import { hapticForce, hapticSelection } from '../../utils/haptics';

const AppearanceScreen = ({ navigation }) => {
  const { accentColorId, hapticsEnabled, setAccentColor, setHapticsEnabled, getAccentColor } = useThemeStore();
  const currentAccent = getAccentColor();

  const handleAccentChange = async (colorId) => {
    if (colorId !== accentColorId) {
      await hapticSelection();
      setAccentColor(colorId);
    }
  };

  const handleHapticsToggle = async (value) => {
    setHapticsEnabled(value);
    // Give feedback when enabling (so user feels what haptics are)
    if (value) {
      await hapticForce('success');
    }
  };

  const handleTestHaptics = async () => {
    await hapticForce('medium');
  };

  const accentColorsList = Object.values(ACCENT_COLORS);

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
        <Text style={styles.title}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Accent Color Section */}
        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Accent Color</Text>
          <Text style={styles.sectionDesc}>
            Choose a color for buttons, highlights, and interactive elements.
          </Text>

          <View style={styles.colorGrid}>
            {accentColorsList.map((color) => (
              <TouchableOpacity
                key={color.id}
                style={styles.colorOption}
                onPress={() => handleAccentChange(color.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color.primary },
                    accentColorId === color.id && styles.colorSwatchSelected,
                  ]}
                >
                  {accentColorId === color.id && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
                <Text
                  style={[
                    styles.colorName,
                    accentColorId === color.id && { color: color.primary, fontWeight: '600' },
                  ]}
                >
                  {color.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardGlass>

        {/* Preview Section */}
        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewContainer}>
            <TouchableOpacity
              style={[styles.previewButton, { backgroundColor: currentAccent.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.previewButtonText}>Primary Button</Text>
            </TouchableOpacity>
            <View style={styles.previewRow}>
              <View style={[styles.previewBadge, { backgroundColor: currentAccent.primary }]}>
                <Text style={styles.previewBadgeText}>Badge</Text>
              </View>
              <View style={[styles.previewOutlineButton, { borderColor: currentAccent.primary }]}>
                <Text style={[styles.previewOutlineText, { color: currentAccent.primary }]}>Outline</Text>
              </View>
              <View style={[styles.previewIndicator, { backgroundColor: currentAccent.primary }]} />
            </View>
          </View>
        </CardGlass>

        {/* Haptics Section */}
        <CardGlass style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <View style={[styles.settingIconContainer, { backgroundColor: `${currentAccent.primary}20` }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={currentAccent.primary} />
                </View>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Text style={styles.settingDesc}>
                Feel subtle vibrations when interacting with the app
              </Text>
            </View>
            <AnimatedToggle
              value={hapticsEnabled}
              onValueChange={handleHapticsToggle}
              activeColor={currentAccent.primary}
            />
          </View>

          {hapticsEnabled && (
            <TouchableOpacity
              style={[styles.testHapticsButton, { borderColor: `${currentAccent.primary}40` }]}
              onPress={handleTestHaptics}
              activeOpacity={0.7}
            >
              <Ionicons name="pulse-outline" size={18} color={currentAccent.primary} />
              <Text style={[styles.testHapticsText, { color: currentAccent.primary }]}>
                Test Haptics
              </Text>
            </TouchableOpacity>
          )}
        </CardGlass>

        <Text style={styles.footerText}>
          Changes are saved automatically and applied immediately.
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
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  colorOption: {
    width: '33.33%',
    padding: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  colorName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  previewContainer: {
    marginTop: spacing.sm,
  },
  previewButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  previewBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewOutlineButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
  },
  previewOutlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 48,
    lineHeight: 18,
  },
  testHapticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  testHapticsText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

export default AppearanceScreen;
