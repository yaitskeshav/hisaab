import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Pressable,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import CardGlass from './common/CardGlass';
import AppButton from './common/AppButton';

const ExportModal = ({ visible, onClose, onExport, groupName, isLoading }) => {
    const [format, setFormat] = useState('pdf');
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date;
    });
    const [toDate, setToDate] = useState(new Date());
    const [includeSettlements, setIncludeSettlements] = useState(true);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    const formatOptions = [
        { value: 'pdf', label: 'PDF', icon: 'document-text-outline', desc: 'Beautifully formatted report' },
        { value: 'xlsx', label: 'Excel', icon: 'grid-outline', desc: 'Spreadsheet with styling' },
        { value: 'csv', label: 'CSV', icon: 'list-outline', desc: 'Simple data file' },
    ];

    const handleExport = () => {
        onExport({
            format,
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            includeSettlements,
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <CardGlass style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Export Data</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Export expenses from <Text style={styles.highlight}>{groupName}</Text>
                    </Text>

                    {/* Format Selection */}
                    <Text style={styles.sectionLabel}>Choose Format</Text>
                    <View style={styles.formatGrid}>
                        {formatOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.formatCard,
                                    format === opt.value && styles.formatCardSelected,
                                ]}
                                onPress={() => setFormat(opt.value)}
                            >
                                <Ionicons
                                    name={opt.icon}
                                    size={24}
                                    color={format === opt.value ? colors.primary : colors.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.formatLabel,
                                        format === opt.value && styles.formatLabelSelected,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                                <Text style={styles.formatDesc}>{opt.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Date Range */}
                    <Text style={styles.sectionLabel}>Date Range</Text>
                    <View style={styles.dateRow}>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowFromPicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.dateText}>{formatDate(fromDate)}</Text>
                        </TouchableOpacity>
                        <Text style={styles.dateArrow}>→</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowToPicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.dateText}>{formatDate(toDate)}</Text>
                        </TouchableOpacity>
                    </View>

                    {showFromPicker && (
                        <DateTimePicker
                            value={fromDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                setShowFromPicker(false);
                                if (date) setFromDate(date);
                            }}
                            maximumDate={toDate}
                        />
                    )}

                    {showToPicker && (
                        <DateTimePicker
                            value={toDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                setShowToPicker(false);
                                if (date) setToDate(date);
                            }}
                            minimumDate={fromDate}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Include Settlements */}
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setIncludeSettlements(!includeSettlements)}
                    >
                        <View style={[styles.checkbox, includeSettlements && styles.checkboxChecked]}>
                            {includeSettlements && (
                                <Ionicons name="checkmark" size={16} color={colors.textPrimary} />
                            )}
                        </View>
                        <Text style={styles.checkboxLabel}>Include Settlements</Text>
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="mail-outline" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>
                            The export will be sent to your registered email address.
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <AppButton
                            title="Cancel"
                            onPress={onClose}
                            variant="ghost"
                            style={styles.button}
                        />
                        <AppButton
                            title={`Export ${format.toUpperCase()}`}
                            onPress={handleExport}
                            loading={isLoading}
                            style={styles.button}
                        />
                    </View>
                </CardGlass>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    content: {
        padding: spacing.xl,
        backgroundColor: colors.backgroundLight,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    highlight: {
        color: colors.primary,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    formatGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    formatCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.glassBorder,
        backgroundColor: colors.glass,
        alignItems: 'center',
    },
    formatCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}20`,
    },
    formatLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: spacing.xs,
    },
    formatLabelSelected: {
        color: colors.primary,
    },
    formatDesc: {
        fontSize: 10,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 4,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.glass,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        gap: spacing.sm,
    },
    dateText: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    dateArrow: {
        color: colors.textMuted,
        fontSize: 18,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.glassBorder,
        backgroundColor: colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
        padding: spacing.md,
        borderRadius: 8,
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    button: {
        flex: 1,
    },
});

export default ExportModal;
