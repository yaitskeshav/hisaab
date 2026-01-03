import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

const NeumorphicCard = ({ children, style, inset = false }) => {
  if (inset) {
    return (
      <View style={[styles.insetContainer, style]}>
        {children}
      </View>
    );
  }

  return (
    <Shadow
      distance={10}
      startColor={colors.shadowDark}
      offset={[8, 8]}
    >
      <Shadow
        distance={8}
        startColor={colors.shadowLight}
        offset={[-6, -6]}
      >
        <View style={[styles.card, style]}>
          {children}
        </View>
      </Shadow>
    </Shadow>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  insetContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.shadowDark,
  }
});

export default NeumorphicCard;
