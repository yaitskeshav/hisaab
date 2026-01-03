import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme/spacing';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset animation values
    translateY.setValue(-100);
    opacity.setValue(0);

    // Show toast
    setToast({ visible: true, message, type });

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

  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          bgColor: 'rgba(16, 185, 129, 0.95)',
        };
      case 'error':
        return {
          icon: 'close-circle',
          bgColor: 'rgba(239, 68, 68, 0.95)',
        };
      case 'warning':
        return {
          icon: 'warning',
          bgColor: 'rgba(245, 158, 11, 0.95)',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle',
          bgColor: 'rgba(59, 130, 246, 0.95)',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: config.bgColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name={config.icon} size={22} color="#fff" />
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 12,
    zIndex: 99999,
    elevation: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default ToastProvider;
