import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import CardGlass from '../../components/common/CardGlass';
import Toast from '../../components/common/Toast';
import useAuthStore from '../../store/authStore';
import { useAccentColor } from '../../store/themeStore';

const { width } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
    const [success, setSuccess] = useState(false);
    const [emailError, setEmailError] = useState('');

    const { forgotPassword, isLoading } = useAuthStore();
    const accent = useAccentColor();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const successScale = useRef(new Animated.Value(0)).current;
    const checkmarkAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleReset = async () => {
        setEmailError('');

        if (!email) {
            setEmailError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email');
            return;
        }

        const result = await forgotPassword(email);
        if (result.success) {
            // Animate to success state
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setSuccess(true);
                Animated.parallel([
                    Animated.spring(successScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.timing(checkmarkAnim, {
                        toValue: 1,
                        duration: 600,
                        delay: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        } else {
            setToast({ visible: true, message: result.error, type: 'error' });
        }
    };

    if (success) {
        return (
            <LinearGradient
                colors={[colors.background, colors.backgroundDark]}
                style={styles.container}
            >
                <View style={styles.successContainer}>
                    <Animated.View style={[
                        styles.successContent,
                        {
                            transform: [{ scale: successScale }],
                            opacity: successScale,
                        }
                    ]}>
                        {/* Animated checkmark circle */}
                        <View style={styles.successIconWrapper}>
                            <LinearGradient
                                colors={['#00F3D1', '#0099F7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.successIconGradient}
                            >
                                <Animated.View style={{
                                    opacity: checkmarkAnim,
                                    transform: [{
                                        scale: checkmarkAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                        })
                                    }]
                                }}>
                                    <Ionicons name="mail-outline" size={48} color="#fff" />
                                </Animated.View>
                            </LinearGradient>
                        </View>

                        <Text style={styles.successTitle}>Check your inbox</Text>
                        <Text style={styles.successSubtitle}>
                            We've sent a password reset link to
                        </Text>
                        <Text style={[styles.successEmail, { color: accent.primary }]}>{email}</Text>

                        <View style={styles.instructionBox}>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionNumber, { backgroundColor: accent.primary }]}>
                                    <Text style={styles.instructionNumberText}>1</Text>
                                </View>
                                <Text style={styles.instructionText}>Open the email on your phone or computer</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionNumber, { backgroundColor: accent.primary }]}>
                                    <Text style={styles.instructionNumberText}>2</Text>
                                </View>
                                <Text style={styles.instructionText}>Click the reset link</Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionNumber, { backgroundColor: accent.primary }]}>
                                    <Text style={styles.instructionNumberText}>3</Text>
                                </View>
                                <Text style={styles.instructionText}>Set your new password</Text>
                            </View>
                        </View>

                        <Text style={styles.spamNote}>
                            Didn't receive it? Check your spam folder
                        </Text>

                        <AppButton
                            title="Back to Login"
                            onPress={() => navigation.navigate('Login')}
                            variant="outline"
                            style={styles.backButton}
                        />

                        <TouchableOpacity
                            onPress={() => {
                                setSuccess(false);
                                setEmail('');
                                fadeAnim.setValue(1);
                            }}
                            style={styles.resendLink}
                        >
                            <Text style={styles.resendLinkText}>Try a different email</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={[colors.background, colors.backgroundDark]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header with back button */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButtonTop}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }
                        ]}
                    >
                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['#00F3D1', '#0099F7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.logoGradient}
                            >
                                <Ionicons name="key-outline" size={32} color="#fff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>Forgot password?</Text>
                        <Text style={styles.subtitle}>
                            No worries! Enter your email and we'll send you a reset link.
                        </Text>

                        <CardGlass style={styles.card}>
                            <AppInput
                                label="Email address"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setEmailError('');
                                }}
                                placeholder="you@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                error={emailError}
                                leftIcon={
                                    <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                                }
                            />

                            <AppButton
                                title="Send Reset Link"
                                onPress={handleReset}
                                loading={isLoading}
                                style={styles.submitButton}
                            />
                        </CardGlass>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.loginLink}
                        >
                            <Ionicons name="arrow-back" size={16} color={accent.primary} />
                            <Text style={[styles.loginLinkText, { color: accent.primary }]}>Back to Login</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.xl,
    },
    backButtonTop: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: spacing['2xl'],
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoGradient: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
        paddingHorizontal: spacing.md,
    },
    card: {
        padding: spacing.lg,
    },
    submitButton: {
        marginTop: spacing.md,
    },
    loginLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        gap: spacing.xs,
    },
    loginLinkText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    // Success state styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    successContent: {
        alignItems: 'center',
    },
    successIconWrapper: {
        marginBottom: spacing.xl,
    },
    successIconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
    },
    successEmail: {
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
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
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
    backButton: {
        width: '100%',
        marginBottom: spacing.md,
    },
    resendLink: {
        padding: spacing.sm,
    },
    resendLinkText: {
        color: colors.textMuted,
        fontSize: 14,
    },
});

export default ForgotPasswordScreen;
