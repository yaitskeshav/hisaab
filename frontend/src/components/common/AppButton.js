import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors as themeColors } from '../../theme/colors';
import { useAccentColor } from '../../store/themeStore';
import { hapticLight } from '../../utils/haptics';

const AppButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const accent = useAccentColor();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: accent.primary,
          shadowColor: accent.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: accent.primary,
        };
      case 'ghost':
        return styles.ghost;
      case 'glass':
        return styles.glass;
      default:
        return {
          backgroundColor: accent.primary,
          shadowColor: accent.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return accent.primary;
    }
    return themeColors.textPrimary;
  };

  const handlePress = async () => {
    await hapticLight();
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? accent.primary : themeColors.textPrimary} />
      ) : (
        <>
          {icon && icon}
          <Text style={[
            styles.text,
            { color: getTextColor() },
            textStyle,
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  // Variants
  secondary: {
    backgroundColor: themeColors.secondary,
    shadowColor: themeColors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  glass: {
    backgroundColor: themeColors.cardBg,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  // Sizes
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  // Text
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppButton;
