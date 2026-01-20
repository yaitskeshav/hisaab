import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAccentColor } from '../store/themeStore';
import { hapticSuccess, hapticError, hapticWarning, hapticLight } from '../utils/haptics';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const accent = useAccentColor();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(100)).current;
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset animation values
    translateY.setValue(-100);
    opacity.setValue(0);
    progressWidth.setValue(100);

    // Trigger haptic based on toast type
    if (type === 'success') hapticSuccess();
    else if (type === 'error') hapticError();
    else if (type === 'warning') hapticWarning();

    // Show toast
    setToast({ visible: true, message, type, duration });

    // Animate in
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

    // Animate progress bar
    Animated.timing(progressWidth, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // Auto hide after duration
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ visible: false, message: '', type: 'info' });
    });
  }, []);

  const handleDismiss = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await hapticLight();
    hideToast();
  };

  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          accentColor: colors.success,
          label: 'Success',
        };
      case 'error':
        return {
          icon: 'close-circle',
          accentColor: colors.error,
          label: 'Error',
        };
      case 'warning':
        return {
          icon: 'warning',
          accentColor: colors.warning,
          label: 'Warning',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle',
          accentColor: colors.info,
          label: 'Info',
        };
    }
  };

  const config = getTypeConfig();

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={styles.content}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${accent.primary}20` }]}>
              <Ionicons name={config.icon} size={20} color={accent.primary} />
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: accent.primary }]}>{config.label}</Text>
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progress,
                {
                  width: progressWidthInterpolated,
                  backgroundColor: accent.primary,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    left: spacing.md,
    right: spacing.md,
    zIndex: 99999,
    elevation: 999,
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ToastProvider;
