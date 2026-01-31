import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, spacing } from '../../theme/spacing';

const NeumorphicCard = ({ children, style, inset = false }) => {
  const colors = useThemeColors();

  if (inset) {
    return (
      <View
        style={[
          styles.insetContainer,
          { backgroundColor: colors.backgroundLight, borderColor: colors.shadowDark },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Shadow distance={10} startColor={colors.shadowDark} offset={[8, 8]}>
      <Shadow distance={8} startColor={colors.shadowLight} offset={[-6, -6]}>
        <View style={[styles.card, { backgroundColor: colors.backgroundLight }, style]}>
          {children}
        </View>
      </Shadow>
    </Shadow>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  insetContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
});

export default NeumorphicCard;
