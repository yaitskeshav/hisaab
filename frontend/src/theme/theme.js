import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Legacy exports for backward compatibility
export const COLORS = colors;
export const SIZES = {
  padding: spacing.md,
  radius: borderRadius.md,
  font: typography.fontSize.base,
};
export const NEUMORPHIC = {
  shadowLight: colors.shadowLight,
  shadowDark: colors.shadowDark,
};

export default theme;
