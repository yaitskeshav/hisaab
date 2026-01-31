import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { LinearGradient } from 'expo-linear-gradient';

const CardGlass = ({ children, style, gradient = false }) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  if (gradient) {
    const gradientColors = isDark
      ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']
      : ['rgba(0, 0, 0, 0.04)', 'rgba(0, 0, 0, 0.02)'];

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.gradientCard, cardStyle, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
});

export default CardGlass;
