import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAccentColor } from '../../store/themeStore';

const IconButton = ({
  icon,
  onPress,
  size = 40,
  iconSize,
  iconColor,
  variant = 'default',
  style,
  disabled = false,
}) => {
  const accent = useAccentColor();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: accent.primary };
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'glass':
        return { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 2, borderColor: accent.primary };
      default:
        return { backgroundColor: colors.glass };
    }
  };

  // Render icon - support both string (icon name) and React element
  const renderIcon = () => {
    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon}
          size={iconSize || size * 0.5}
          color={iconColor || colors.textPrimary}
        />
      );
    }
    return icon;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        getVariantStyles(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {renderIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
