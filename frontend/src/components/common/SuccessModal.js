import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from './CardGlass';

const SuccessModal = ({
    visible,
    title = 'Success',
    message,
    buttonText = 'Continue',
    onClose,
    icon = 'checkmark-circle',
    type = 'success', // 'success', 'error', 'info'
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const checkAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            checkAnim.setValue(0);
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(checkAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const getTypeConfig = () => {
        switch (type) {
            case 'error':
                return {
                    colors: ['#EF4444', '#DC2626'],
                    iconName: 'close-circle',
                };
            case 'info':
                return {
                    colors: ['#3B82F6', '#2563EB'],
                    iconName: 'information-circle',
                };
            default:
                return {
                    colors: ['#10B981', '#059669'],
                    iconName: 'checkmark-circle',
                };
        }
    };

    const config = getTypeConfig();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View style={{
                    transform: [{ scale: scaleAnim }],
                    opacity: scaleAnim,
                }}>
                    <CardGlass style={styles.container}>
                        <View style={styles.iconWrapper}>
                            <LinearGradient
                                colors={config.colors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.iconGradient}
                            >
                                <Animated.View style={{
                                    opacity: checkAnim,
                                    transform: [{
                                        scale: checkAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                        })
                                    }]
                                }}>
                                    <Ionicons
                                        name={icon || config.iconName}
                                        size={48}
                                        color="#fff"
                                    />
                                </Animated.View>
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>{title}</Text>

                        {message && (
                            <Text style={styles.message}>{message}</Text>
                        )}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={config.colors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>{buttonText}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </CardGlass>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        padding: spacing.xl,
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: spacing.lg,
    },
    iconGradient: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.sm,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default SuccessModal;
