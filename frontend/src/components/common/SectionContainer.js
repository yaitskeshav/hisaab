import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';

const SectionContainer = ({ title, subtitle, children, rightAction, style }) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {(title || rightAction) ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {title ? <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
          </View>
          {rightAction ? <View style={styles.headerRight}>{rightAction}</View> : null}
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {},
});

export default SectionContainer;
