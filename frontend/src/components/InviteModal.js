import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import CardGlass from './common/CardGlass';
import AppButton from './common/AppButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import apiClient from '../api/client';
import Toast from './common/Toast';

const InviteModal = ({ visible, onClose, group }) => {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

    const copyToClipboard = async (text) => {
        try {
            if (!text) return;
            await Clipboard.setStringAsync(text);
            setToast({ visible: true, message: 'Invite code copied!', type: 'success' });
        } catch (error) {
            console.error('Clipboard error:', error);
            setToast({ visible: true, message: 'Failed to copy code', type: 'error' });
        }
    };

    const handleShareLink = async () => {
        if (!group) return;
        setLoading(true);
        try {
            const response = await apiClient.post('/invites', { group_id: group.id });
            const { invite_link } = response.data;

            await Share.share({
                message: `Join my group "${group.name}" on Hisaab! Access it here: ${invite_link}`,
            });
        } catch (error) {
            console.error('Share error:', error);
            setToast({ visible: true, message: 'Failed to generate link', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <CardGlass style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Share Invite</Text>
                        <Text style={styles.shareText}>
                            Anyone with this link or code can join the group "{group?.name}"
                        </Text>

                        <View style={styles.codeContainer}>
                            <Text style={styles.inviteCode}>{group?.invite_code}</Text>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={() => copyToClipboard(group?.invite_code)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.copyButtonText}>Copy</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <AppButton
                                title="Close"
                                onPress={onClose}
                                variant="ghost"
                                style={styles.modalButton}
                            />
                            <AppButton
                                title="Share Link"
                                onPress={handleShareLink}
                                loading={loading}
                                style={styles.modalButton}
                            />
                        </View>
                    </CardGlass>
                </View>
            </Modal>
            <Toast {...toast} onHide={() => setToast({ ...toast, visible: false })} />
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        padding: spacing.xl,
        backgroundColor: colors.backgroundLight,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    shareText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.lg,
        textAlign: 'center',
        lineHeight: 20,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.glass,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    inviteCode: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 2,
        marginRight: spacing.md,
    },
    copyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    copyButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalButton: {
        flex: 1,
    },
});

export default InviteModal;
