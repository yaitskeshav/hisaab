import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const AnimatedToggle = ({
  value,
  onValueChange,
  activeColor = colors.primary,
  inactiveColor = colors.backgroundLight,
  disabled = false,
}) => {
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;
  const bgColor = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 22 : 2,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(bgColor, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor },
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default AnimatedToggle;
