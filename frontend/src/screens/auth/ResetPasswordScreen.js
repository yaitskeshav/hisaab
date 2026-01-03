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

const ResetPasswordScreen = ({ navigation, route }) => {
    // Extract token from deep link params
    const tokenFromLink = route?.params?.token || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    const { resetPassword, isLoading } = useAuthStore();

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

    // Password strength calculator
    const getPasswordStrength = (pass) => {
        if (!pass) return { level: 0, label: '', color: colors.textMuted };

        let strength = 0;
        if (pass.length >= 8) strength++;
        if (pass.length >= 12) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;

        if (strength <= 1) return { level: 1, label: 'Weak', color: colors.error };
        if (strength <= 2) return { level: 2, label: 'Fair', color: colors.warning };
        if (strength <= 3) return { level: 3, label: 'Good', color: '#F59E0B' };
        if (strength <= 4) return { level: 4, label: 'Strong', color: colors.accent };
        return { level: 5, label: 'Very Strong', color: colors.success };
    };

    const passwordStrength = getPasswordStrength(password);

    const validate = () => {
        const newErrors = {};

        if (!tokenFromLink) {
            setToast({ visible: true, message: 'Invalid reset link. Please request a new one.', type: 'error' });
            return false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleReset = async () => {
        if (!validate()) return;

        const result = await resetPassword(tokenFromLink, password);
        if (result.success) {
            // Animate to success state
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
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

                // Auto navigate to login after 3 seconds
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                }, 3000);
            });
        } else {
            setToast({ visible: true, message: result.error, type: 'error' });
        }
    };

    // Success state
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
                                colors={['#10B981', '#059669']}
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
                                    <Ionicons name="checkmark" size={56} color="#fff" />
                                </Animated.View>
                            </LinearGradient>
                        </View>

                        <Text style={styles.successTitle}>Password Reset!</Text>
                        <Text style={styles.successSubtitle}>
                            Your password has been successfully updated.
                        </Text>
                        <Text style={styles.successNote}>
                            Redirecting to login...
                        </Text>

                        <AppButton
                            title="Go to Login Now"
                            onPress={() => navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            })}
                            style={styles.loginButton}
                        />
                    </Animated.View>
                </View>
            </LinearGradient>
        );
    }

    // No token - show error state
    if (!tokenFromLink) {
        return (
            <LinearGradient
                colors={[colors.background, colors.backgroundDark]}
                style={styles.container}
            >
                <View style={styles.errorContainer}>
                    <View style={styles.errorIconWrapper}>
                        <LinearGradient
                            colors={[colors.error, '#DC2626']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.errorIconGradient}
                        >
                            <Ionicons name="alert-circle-outline" size={48} color="#fff" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.errorTitle}>Invalid Reset Link</Text>
                    <Text style={styles.errorSubtitle}>
                        This password reset link is invalid or has expired.
                    </Text>

                    <AppButton
                        title="Request New Link"
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.errorButton}
                    />

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.backLink}
                    >
                        <Text style={styles.backLinkText}>Back to Login</Text>
                    </TouchableOpacity>
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
                                <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>Create new password</Text>
                        <Text style={styles.subtitle}>
                            Your new password must be different from previously used passwords.
                        </Text>

                        <CardGlass style={styles.card}>
                            <AppInput
                                label="New Password"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (errors.password) setErrors({ ...errors, password: '' });
                                }}
                                placeholder="Enter new password"
                                secureTextEntry={!showPassword}
                                error={errors.password}
                                leftIcon={
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                                }
                                rightIcon={
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color={colors.textMuted}
                                    />
                                }
                                onRightIconPress={() => setShowPassword(!showPassword)}
                            />

                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBars}>
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <View
                                                key={level}
                                                style={[
                                                    styles.strengthBar,
                                                    {
                                                        backgroundColor: level <= passwordStrength.level
                                                            ? passwordStrength.color
                                                            : colors.glass,
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                            )}

                            <AppInput
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                                }}
                                placeholder="Confirm new password"
                                secureTextEntry={!showConfirmPassword}
                                error={errors.confirmPassword}
                                leftIcon={
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                                }
                                rightIcon={
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color={colors.textMuted}
                                    />
                                }
                                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            />

                            {/* Password match indicator */}
                            {confirmPassword.length > 0 && (
                                <View style={styles.matchIndicator}>
                                    <Ionicons
                                        name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                        size={16}
                                        color={password === confirmPassword ? colors.success : colors.error}
                                    />
                                    <Text style={[
                                        styles.matchText,
                                        { color: password === confirmPassword ? colors.success : colors.error }
                                    ]}>
                                        {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                    </Text>
                                </View>
                            )}

                            <AppButton
                                title="Reset Password"
                                onPress={handleReset}
                                loading={isLoading}
                                style={styles.submitButton}
                            />
                        </CardGlass>

                        <View style={styles.requirementsList}>
                            <Text style={styles.requirementsTitle}>Password requirements:</Text>
                            <PasswordRequirement
                                met={password.length >= 8}
                                text="At least 8 characters"
                            />
                            <PasswordRequirement
                                met={/[A-Z]/.test(password)}
                                text="One uppercase letter"
                            />
                            <PasswordRequirement
                                met={/[0-9]/.test(password)}
                                text="One number"
                            />
                            <PasswordRequirement
                                met={/[^A-Za-z0-9]/.test(password)}
                                text="One special character"
                            />
                        </View>
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

const PasswordRequirement = ({ met, text }) => (
    <View style={styles.requirementRow}>
        <Ionicons
            name={met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={met ? colors.success : colors.textMuted}
        />
        <Text style={[
            styles.requirementText,
            met && styles.requirementMet
        ]}>
            {text}
        </Text>
    </View>
);

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
        paddingBottom: spacing.xl,
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
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        marginTop: -spacing.sm,
    },
    strengthBars: {
        flexDirection: 'row',
        flex: 1,
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: spacing.sm,
        minWidth: 70,
        textAlign: 'right',
    },
    matchIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -spacing.sm,
        marginBottom: spacing.md,
        gap: spacing.xs,
    },
    matchText: {
        fontSize: 12,
        fontWeight: '500',
    },
    submitButton: {
        marginTop: spacing.md,
    },
    requirementsList: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    requirementsTitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },
    requirementText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    requirementMet: {
        color: colors.textSecondary,
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
        marginBottom: spacing.sm,
    },
    successNote: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        fontStyle: 'italic',
    },
    loginButton: {
        width: '100%',
    },
    // Error state styles
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorIconWrapper: {
        marginBottom: spacing.xl,
    },
    errorIconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    errorButton: {
        width: '100%',
        marginBottom: spacing.md,
    },
    backLink: {
        padding: spacing.sm,
    },
    backLinkText: {
        color: colors.textMuted,
        fontSize: 14,
    },
});

export default ResetPasswordScreen;
