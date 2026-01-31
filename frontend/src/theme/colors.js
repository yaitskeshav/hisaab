// Dark theme colors (existing)
export const darkColors = {
  // Primary palette - More vibrant
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  secondary: '#8B5CF6',
  secondaryLight: '#A78BFA',
  secondaryDark: '#7C3AED',

  accent: '#10B981',
  accentLight: '#34D399',
  accentDark: '#059669',

  // Backgrounds - Darker for better contrast
  background: '#0F172A',
  backgroundLight: '#1E293B',
  backgroundDark: '#020617',

  // Surface colors (glassmorphism) - Less transparent
  glass: 'rgba(255, 255, 255, 0.1)',
  glassLight: 'rgba(255, 255, 255, 0.15)',
  glassDark: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',

  // Text - Better contrast
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Neumorphic shadows
  shadowLight: 'rgba(255, 255, 255, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.6)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Card backgrounds
  cardBg: 'rgba(30, 41, 59, 0.8)',
  cardBorder: 'rgba(148, 163, 184, 0.1)',

  // Tab bar
  tabBarBg: '#1B262C',
  tabBarBorder: 'rgba(255, 255, 255, 0.18)',
  tabBarInactive: '#7A8A95',
};

// Light theme colors
export const lightColors = {
  // Primary palette - Same vibrant colors
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  secondary: '#8B5CF6',
  secondaryLight: '#A78BFA',
  secondaryDark: '#7C3AED',

  accent: '#10B981',
  accentLight: '#34D399',
  accentDark: '#059669',

  // Backgrounds - Light
  background: '#F1F5F9',
  backgroundLight: '#FFFFFF',
  backgroundDark: '#E2E8F0',

  // Surface colors (glassmorphism) - Inverted for light
  glass: 'rgba(0, 0, 0, 0.04)',
  glassLight: 'rgba(0, 0, 0, 0.06)',
  glassDark: 'rgba(0, 0, 0, 0.02)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',

  // Text - Dark on light
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  // Status - Same
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Shadows - Adjusted for light
  shadowLight: 'rgba(255, 255, 255, 0.8)',
  shadowDark: 'rgba(0, 0, 0, 0.1)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Card backgrounds
  cardBg: 'rgba(255, 255, 255, 0.9)',
  cardBorder: 'rgba(0, 0, 0, 0.06)',

  // Tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(0, 0, 0, 0.1)',
  tabBarInactive: '#94A3B8',
};

// Default export for backward compatibility (dark theme)
export const colors = darkColors;
