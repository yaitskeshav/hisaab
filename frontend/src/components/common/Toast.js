import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { useAccentColor } from '../../store/themeStore';
import { hapticSuccess, hapticError, hapticWarning, hapticLight } from '../../utils/haptics';

const Toast = ({ message, type = 'info', visible, onHide, duration = 3000 }) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const accent = useAccentColor();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      progressWidth.setValue(100);

      if (type === 'success') hapticSuccess();
      else if (type === 'error') hapticError();
      else if (type === 'warning') hapticWarning();

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(progressWidth, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const handleDismiss = async () => {
    await hapticLight();
    hideToast();
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', accentColor: colors.success, label: 'Success' };
      case 'error':
        return { icon: 'close-circle', accentColor: colors.error, label: 'Error' };
      case 'warning':
        return { icon: 'warning', accentColor: colors.warning, label: 'Warning' };
      case 'info':
      default:
        return { icon: 'information-circle', accentColor: colors.info, label: 'Info' };
    }
  };

  const config = getTypeConfig();

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const containerBg = isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  const dismissBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const progressBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderColor: colors.cardBorder,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${accent.primary}20` }]}>
          <Ionicons name={config.icon} size={20} color={accent.primary} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: accent.primary }]}>{config.label}</Text>
          <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
            {message}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dismissButton, { backgroundColor: dismissBg }]}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
        <Animated.View
          style={[
            styles.progress,
            { width: progressWidthInterpolated, backgroundColor: accent.primary },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 3,
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
});

export default Toast;
