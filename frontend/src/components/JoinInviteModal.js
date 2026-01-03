import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardGlass from './common/CardGlass';
import AppButton from './common/AppButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import apiClient, { API_URL } from '../api/client';
import useGroupStore from '../store/groupStore';
import useInviteStore from '../store/inviteStore';
import storage from '../utils/storage';

const JoinInviteModal = ({ token, visible, onHide, onJoined }) => {
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [inviteDetails, setInviteDetails] = useState(null);
    const [error, setError] = useState(null);
    const { fetchGroups } = useGroupStore();
    const clearPendingInviteToken = useInviteStore(state => state.clearPendingInviteToken);

    useEffect(() => {
        if (visible && token) {
            loadInviteDetails();
        }
    }, [visible, token]);

    const loadInviteDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const tokenValue = await storage.getItem('access_token');
            const url = `/invites/${token}${tokenValue ? `?access_token=${tokenValue}` : ''}`;
            const response = await apiClient.get(url);
            setInviteDetails(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired invite link');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setJoining(true);
        try {
            await apiClient.post(`/invites/${token}/join`);
            await fetchGroups(); // Refresh groups list
            clearPendingInviteToken();
            onJoined && onJoined(inviteDetails?.group_id);
            onHide();
        } catch (err) {
            console.error('Join error:', err);
            setError(err.response?.data?.error || 'Failed to join group');
        } finally {
            setJoining(false);
        }
    };

    const handleClose = () => {
        clearPendingInviteToken();
        onHide();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <CardGlass style={styles.content}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Ionicons name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="people" size={40} color={colors.primary} />
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingText}>Fetching group details...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={48} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                            <AppButton
                                title="Dismiss"
                                onPress={handleClose}
                                variant="outline"
                                style={styles.actionButton}
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.title}>
                                {inviteDetails?.is_member ? 'Group Details' : 'Join Group'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {inviteDetails?.is_member
                                    ? 'You are already a member of this group'
                                    : `You've been invited to join`}
                            </Text>
                            <Text style={styles.groupName}>{inviteDetails?.group_name}</Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{inviteDetails?.member_count}</Text>
                                    <Text style={styles.statLabel}>Members</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Invited by</Text>
                                    <Text style={styles.statValueShort}>{inviteDetails?.created_by}</Text>
                                </View>
                            </View>

                            <Text style={styles.disclaimer}>
                                {inviteDetails?.is_member
                                    ? 'Click below to view the group expenses and members.'
                                    : 'By joining, you\'ll be able to see and add expenses for this group.'}
                            </Text>

                            <View style={styles.actions}>
                                <AppButton
                                    title={inviteDetails?.is_member ? "Close" : "Not Now"}
                                    onPress={handleClose}
                                    variant="ghost"
                                    style={styles.flexButton}
                                />
                                <AppButton
                                    title={inviteDetails?.is_member ? "View Group" : "Join Group"}
                                    onPress={inviteDetails?.is_member ? () => {
                                        onJoined && onJoined(inviteDetails.group_id);
                                        onHide();
                                    } : handleJoin}
                                    loading={joining}
                                    style={styles.flexButton}
                                />
                            </View>
                        </>
                    )}
                </CardGlass>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        padding: spacing.xl,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        zIndex: 1,
    },
    iconContainer: {
        marginBottom: spacing.lg,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.textSecondary,
        fontSize: 14,
    },
    errorContainer: {
        alignItems: 'center',
        padding: spacing.md,
    },
    errorText: {
        color: colors.error,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    groupName: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.xl,
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    statValueShort: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 2,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: colors.glassBorder,
        marginHorizontal: spacing.md,
    },
    disclaimer: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    flexButton: {
        flex: 1,
    },
    actionButton: {
        width: '100%',
        minWidth: 150,
    },
});

export default JoinInviteModal;
