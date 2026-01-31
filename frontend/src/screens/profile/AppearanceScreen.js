import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import AnimatedToggle from '../../components/common/AnimatedToggle';
import useThemeStore, { ACCENT_COLORS, COLOR_SCHEMES } from '../../store/themeStore';
import { hapticForce, hapticSelection } from '../../utils/haptics';

const AppearanceScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const {
    accentColorId,
    hapticsEnabled,
    colorScheme,
    setAccentColor,
    setHapticsEnabled,
    setColorScheme,
    getAccentColor,
  } = useThemeStore();
  const currentAccent = getAccentColor();

  const handleThemeChange = async (schemeId) => {
    if (schemeId !== colorScheme) {
      await hapticSelection();
      setColorScheme(schemeId);
    }
  };

  const handleAccentChange = async (colorId) => {
    if (colorId !== accentColorId) {
      await hapticSelection();
      setAccentColor(colorId);
    }
  };

  const handleHapticsToggle = async (value) => {
    setHapticsEnabled(value);
    if (value) {
      await hapticForce('success');
    }
  };

  const handleTestHaptics = async () => {
    await hapticForce('medium');
  };

  const accentColorsList = Object.values(ACCENT_COLORS);
  const themeOptions = Object.values(COLOR_SCHEMES);

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Theme Section */}
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Theme</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Choose your preferred color scheme.
          </Text>

          <View style={styles.themeRow}>
            {themeOptions.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.glass, borderColor: colors.glassBorder },
                  colorScheme === theme.id && {
                    backgroundColor: `${currentAccent.primary}20`,
                    borderColor: currentAccent.primary,
                  },
                ]}
                onPress={() => handleThemeChange(theme.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.themeIconContainer,
                    {
                      backgroundColor:
                        colorScheme === theme.id
                          ? `${currentAccent.primary}30`
                          : colors.glassLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={theme.icon}
                    size={22}
                    color={colorScheme === theme.id ? currentAccent.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.themeName,
                    { color: colors.textSecondary },
                    colorScheme === theme.id && {
                      color: currentAccent.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {theme.name}
                </Text>
                {colorScheme === theme.id && (
                  <View style={[styles.themeCheck, { backgroundColor: currentAccent.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </CardGlass>

        {/* Accent Color Section */}
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Accent Color</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
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
                    { color: colors.textSecondary },
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
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preview</Text>
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
                <Text style={[styles.previewOutlineText, { color: currentAccent.primary }]}>
                  Outline
                </Text>
              </View>
              <View style={[styles.previewIndicator, { backgroundColor: currentAccent.primary }]} />
            </View>
          </View>
        </CardGlass>

        {/* Haptics Section */}
        <CardGlass style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Feedback</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <View
                  style={[
                    styles.settingIconContainer,
                    { backgroundColor: `${currentAccent.primary}20` },
                  ]}
                >
                  <Ionicons name="phone-portrait-outline" size={20} color={currentAccent.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Haptic Feedback
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
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
              style={[
                styles.testHapticsButton,
                { borderColor: `${currentAccent.primary}40`, backgroundColor: colors.glass },
              ]}
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

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
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
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  // Theme selection
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  themeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  themeName: {
    fontSize: 13,
    fontWeight: '500',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Accent colors
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
  },
  // Preview
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
  // Settings
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
  },
  settingDesc: {
    fontSize: 13,
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
    borderWidth: 1,
  },
  testHapticsText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

export default AppearanceScreen;
