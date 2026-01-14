import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppButton from '../../components/common/AppButton';
import Toast from '../../components/common/Toast';
import useAuthStore from '../../store/authStore';
import { useAccentColor } from '../../store/themeStore';

const EmailVerificationScreen = ({ navigation, route }) => {
    const email = route.params?.email || '';
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
    const [resendCooldown, setResendCooldown] = useState(0);

    const { resendVerification, isLoading } = useAuthStore();
    const accent = useAccentColor();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const iconAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(iconAnim, {
                toValue: 1,
                duration: 800,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResend = async () => {
        if (resendCooldown > 0 || !email) return;

        const result = await resendVerification(email);
        if (result.success) {
            setToast({ visible: true, message: 'Verification email sent!', type: 'success' });
            setResendCooldown(60);
        } else {
            setToast({ visible: true, message: result.error || 'Failed to resend', type: 'error' });
        }
    };

    return (
        <LinearGradient
            colors={[colors.background, colors.backgroundDark]}
            style={styles.container}
        >
            <View style={styles.content}>
                <Animated.View style={[
                    styles.animatedContent,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}>
                    {/* Animated icon */}
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Animated.View style={{
                                opacity: iconAnim,
                                transform: [{
                                    scale: iconAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1],
                                    })
                                }]
                            }}>
                                <Ionicons name="mail-unread-outline" size={48} color="#fff" />
                            </Animated.View>
                        </LinearGradient>
                    </View>

                    <Text style={styles.title}>Verify your email</Text>
                    <Text style={styles.subtitle}>
                        We've sent a verification link to
                    </Text>
                    <Text style={[styles.email, { color: accent.primary }]}>{email}</Text>

                    {/* Instructions */}
                    <View style={styles.instructionBox}>
                        <View style={styles.instructionRow}>
                            <View style={styles.instructionNumber}>
                                <Text style={styles.instructionNumberText}>1</Text>
                            </View>
                            <Text style={styles.instructionText}>Open your email inbox</Text>
                        </View>
                        <View style={styles.instructionRow}>
                            <View style={styles.instructionNumber}>
                                <Text style={styles.instructionNumberText}>2</Text>
                            </View>
                            <Text style={styles.instructionText}>Tap the verification link</Text>
                        </View>
                        <View style={styles.instructionRow}>
                            <View style={[styles.instructionNumber, styles.lastInstruction]}>
                                <Text style={styles.instructionNumberText}>3</Text>
                            </View>
                            <Text style={styles.instructionText}>You'll be signed in automatically</Text>
                        </View>
                    </View>

                    <Text style={styles.spamNote}>
                        Didn't receive it? Check your spam folder
                    </Text>

                    {/* Resend button */}
                    <AppButton
                        title={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                        onPress={handleResend}
                        loading={isLoading}
                        disabled={resendCooldown > 0}
                        variant="outline"
                        style={styles.resendButton}
                    />

                    {/* Back to login */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.loginLink}
                    >
                        <Ionicons name="arrow-back" size={16} color={accent.primary} />
                        <Text style={[styles.loginLinkText, { color: accent.primary }]}>Back to Login</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <Toast
                {...toast}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    animatedContent: {
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: spacing.xl,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
    },
    email: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    instructionBox: {
        backgroundColor: colors.glass,
        borderRadius: 16,
        padding: spacing.lg,
        width: '100%',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    lastInstruction: {
        marginBottom: 0,
    },
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    instructionNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    instructionText: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
    },
    spamNote: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    resendButton: {
        width: '100%',
        marginBottom: spacing.md,
    },
    loginLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        gap: spacing.xs,
        padding: spacing.sm,
    },
    loginLinkText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '500',
    },
});

export default EmailVerificationScreen;
