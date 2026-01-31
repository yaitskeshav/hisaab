import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Image,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';
import { colors as staticColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import Loader from '../../components/common/Loader';
import useExpenseStore from '../../store/expenseStore';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import { useAccentColor } from '../../store/themeStore';
import apiClient, { BASE_URL } from '../../api/client';
import storage from '../../utils/storage';
import { CATEGORIES } from '../../constants/categories';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import ActionSheet from '../../components/common/ActionSheet';

const LOGO_TOKEN = 'pk_DsdbpwSLSoKDmEeVlTPsyg';

const APPS = [
  { id: 'none', name: 'None', icon: null, color: '#666' },
  { id: 'swiggy', name: 'Swiggy', icon: `https://img.logo.dev/swiggy.com?token=${LOGO_TOKEN}`, color: '#FC8019' },
  { id: 'zomato', name: 'Zomato', icon: `https://img.logo.dev/zomato.com?token=${LOGO_TOKEN}`, color: '#E23744' },
  { id: 'amazon', name: 'Amazon', icon: `https://img.logo.dev/amazon.com?token=${LOGO_TOKEN}`, color: '#FF9900' },
  { id: 'flipkart', name: 'Flipkart', icon: `https://img.logo.dev/flipkart.com?token=${LOGO_TOKEN}`, color: '#2874F0' },
  { id: 'uber', name: 'Uber', icon: `https://img.logo.dev/uber.com?token=${LOGO_TOKEN}`, color: '#000000' },
  { id: 'ola', name: 'Ola', icon: `https://img.logo.dev/olacabs.com?token=${LOGO_TOKEN}`, color: '#32CD32' },
  { id: 'blinkit', name: 'Blinkit', icon: `https://img.logo.dev/blinkit.com?token=${LOGO_TOKEN}`, color: '#F8CB46' },
  { id: 'zepto', name: 'Zepto', icon: `https://img.logo.dev/zeptonow.com?token=${LOGO_TOKEN}`, color: '#8B3EEA' },
  { id: 'dunzo', name: 'Dunzo', icon: `https://img.logo.dev/dunzo.com?token=${LOGO_TOKEN}`, color: '#ED3024' },
  { id: 'bigbasket', name: 'BigBasket', icon: `https://img.logo.dev/bigbasket.com?token=${LOGO_TOKEN}`, color: '#84C225' },
  { id: 'myntra', name: 'Myntra', icon: `https://img.logo.dev/myntra.com?token=${LOGO_TOKEN}`, color: '#FF3F6C' },
  { id: 'ajio', name: 'Ajio', icon: `https://img.logo.dev/ajio.com?token=${LOGO_TOKEN}`, color: '#C1A053' },
  { id: 'bookmyshow', name: 'BookMyShow', icon: `https://img.logo.dev/bookmyshow.com?token=${LOGO_TOKEN}`, color: '#C4242B' },
  { id: 'paytm', name: 'Paytm', icon: `https://img.logo.dev/paytm.com?token=${LOGO_TOKEN}`, color: '#00BAF2' },
  { id: 'phonepe', name: 'PhonePe', icon: `https://img.logo.dev/phonepe.com?token=${LOGO_TOKEN}`, color: '#5F259F' },
  { id: 'gpay', name: 'Google Pay', icon: `https://img.logo.dev/pay.google.com?token=${LOGO_TOKEN}`, color: '#4285F4' },
  { id: 'other', name: 'Other', icon: null, color: '#888' },
];

const SPLIT_TYPES = [
  { value: 'EQUAL', label: 'Equal Split', icon: '⚖️', desc: 'Split equally among all members' },
  { value: 'CUSTOM', label: 'Custom Split', icon: '✏️', desc: 'Specify custom amounts' },
];

const CUSTOM_SPLIT_MODES = [
  { value: 'AMOUNT', label: 'By Amount', icon: '💰', desc: 'Enter specific amounts for each person' },
  { value: 'PERCENTAGE', label: 'By Percentage', icon: '%', desc: 'Split by percentage for each person' },
  { value: 'SINGLE', label: 'Single Person', icon: '👤', desc: 'One person owes the full amount' },
];

const AddExpenseScreen = ({ route, navigation }) => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const { groupId, expense: passedExpense } = route.params || {};
  const { user } = useAuthStore();
  const { createExpense, updateExpense, deleteExpense, isLoading } = useExpenseStore();
  const { groups } = useGroupStore();
  const { showToast } = useToast();
  const accent = useAccentColor();

  const [editingExpense, setEditingExpense] = useState(passedExpense?.title ? passedExpense : null);
  const [fetchingExpense, setFetchingExpense] = useState(!!(passedExpense?.id && !passedExpense?.title));

  const currentGroup = groups.find(g => g.id === (groupId || editingExpense?.group_id || passedExpense?.group_id));
  const isEditMode = !!editingExpense || !!passedExpense?.id;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedApp, setSelectedApp] = useState(APPS[0]);
  const [orderReference, setOrderReference] = useState('');
  const [splitType, setSplitType] = useState('EQUAL');
  const [customSplitMode, setCustomSplitMode] = useState('AMOUNT');
  const [selectedMember, setSelectedMember] = useState(null);
  const isInitialLoadRef = useRef(true); // Ref to track if this is initial load
  const [initialValues, setInitialValues] = useState(null); // Store initial values for edit mode
  const [customSplits, setCustomSplits] = useState({});
  const [attachments, setAttachments] = useState([]); // New files to upload
  const [existingAttachments, setExistingAttachments] = useState([]); // Already saved attachments
  const [imagePreview, setImagePreview] = useState(null); // For viewing images
  const [pdfPreview, setPdfPreview] = useState(null); // For viewing PDFs
  const [loadingFile, setLoadingFile] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [customSplitModalVisible, setCustomSplitModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFileActionSheet, setShowFileActionSheet] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null); // { type: 'existing' | 'new', id/index, name }

  // Collapsible sections
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showSplitConfig, setShowSplitConfig] = useState(true); // Default open for important section
  const [showAttachments, setShowAttachments] = useState(false);

  const toggleSection = (section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'order') {
      setShowOrderDetails(!showOrderDetails);
    } else if (section === 'split') {
      setShowSplitConfig(!showSplitConfig);
    } else if (section === 'attachments') {
      setShowAttachments(!showAttachments);
    }
  };

  // Format number without unnecessary decimals
  const formatSplitValue = (value, isPercentage = false) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    // Remove trailing zeros after decimal point
    const formatted = isPercentage ? num.toFixed(2) : num.toFixed(2);
    return formatted.replace(/\.?0+$/, '');
  };

  // Calculate remaining amount/percentage for display
  const getRemainingValue = () => {
    if (!amount || parseFloat(amount) <= 0) return null;

    const memberIds = currentGroup?.members?.map(m => String(m.id)) || [];
    const filledTotal = memberIds.reduce((sum, id) => sum + (parseFloat(customSplits[id]) || 0), 0);

    if (customSplitMode === 'AMOUNT') {
      const remaining = parseFloat(amount) - filledTotal;
      return { value: remaining, formatted: formatSplitValue(remaining) };
    } else if (customSplitMode === 'PERCENTAGE') {
      const remaining = 100 - filledTotal;
      return { value: remaining, formatted: formatSplitValue(remaining, true) };
    }
    return null;
  };

  // Handle split value change (no auto-fill on every keystroke)
  const handleCustomSplitChange = (memberId, value) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: value }));
  };

  // Fill remaining value for a specific member
  const fillRemainingForMember = (memberId) => {
    const remaining = getRemainingValue();
    if (remaining && remaining.value > 0) {
      setCustomSplits(prev => ({ ...prev, [memberId]: remaining.formatted }));
    }
  };

  // Reset all splits
  const resetSplits = () => {
    setCustomSplits({});
  };

  // Distribute equally among all members
  const distributeEqually = () => {
    if (!amount || parseFloat(amount) <= 0 || !currentGroup?.members?.length) return;

    const memberCount = currentGroup.members.length;
    const newSplits = {};

    if (customSplitMode === 'AMOUNT') {
      const perPerson = parseFloat(amount) / memberCount;
      currentGroup.members.forEach(member => {
        newSplits[member.id] = formatSplitValue(perPerson);
      });
    } else if (customSplitMode === 'PERCENTAGE') {
      const perPerson = 100 / memberCount;
      currentGroup.members.forEach(member => {
        newSplits[member.id] = formatSplitValue(perPerson, true);
      });
    }

    setCustomSplits(newSplits);
  };

  // Fetch expense data if only ID is provided
  useEffect(() => {
    const fetchExpenseData = async () => {
      if (passedExpense?.id && !passedExpense?.title && !editingExpense) {
        setFetchingExpense(true);
        try {
          const { data } = await apiClient.get(`/expenses/${passedExpense.id}`);
          setEditingExpense(data);
        } catch (error) {
          console.error('Failed to fetch expense:', error);
          showToast('Failed to load expense', 'error');
          setTimeout(() => navigation.goBack(), 1500);
        } finally {
          setFetchingExpense(false);
        }
      }
    };
    fetchExpenseData();
  }, [passedExpense?.id]);

  // Clear customSplits when mode changes (but not during initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      return; // Skip clearing on initial load
    }
    // User changed the mode - clear existing values
    setCustomSplits({});
    setSelectedMember(null);
  }, [customSplitMode]);

  useEffect(() => {
    if (isEditMode && editingExpense) {
      isInitialLoadRef.current = true; // Mark as loading

      setTitle(editingExpense.title || '');
      // Handle amount - could be number or string
      const expenseAmount = editingExpense.amount;
      if (expenseAmount !== undefined && expenseAmount !== null) {
        setAmount(String(expenseAmount));
      }
      setSelectedDate(editingExpense.date ? new Date(editingExpense.date) : new Date());
      // Normalize split type to uppercase
      const normalizedSplitType = (editingExpense.split_type || 'EQUAL').toUpperCase();
      setSplitType(normalizedSplitType);
      setOrderReference(editingExpense.reference_id || '');

      const category = CATEGORIES.find(c => c.id === Number(editingExpense.category_id));
      if (category) setSelectedCategory(category);

      const app = APPS.find(a => a.id === editingExpense.app_name);
      if (app) setSelectedApp(app);

      // Load existing attachments
      if (editingExpense.attachments?.length > 0) {
        setExistingAttachments(editingExpense.attachments);
      }

      // Load existing splits for CUSTOM split type
      const expenseSplitType = editingExpense.split_type?.toUpperCase();
      if (expenseSplitType === 'CUSTOM' && editingExpense.splits?.length > 0) {
        const splits = editingExpense.splits;
        const savedSplitMode = editingExpense.split_mode?.toUpperCase() || '';

        // Use saved split mode if available
        if (savedSplitMode === 'SINGLE' || (splits.length === 1 && currentGroup?.members?.length > 1)) {
          setCustomSplitMode('SINGLE');
          const member = currentGroup?.members?.find(m => m.id === splits[0].user_id);
          if (member) setSelectedMember(member);
        } else if (savedSplitMode === 'PERCENTAGE') {
          // Load as percentage mode using stored percentage values
          setCustomSplitMode('PERCENTAGE');
          const splitsMap = {};
          splits.forEach(split => {
            const userId = split.user_id || split.UserID;
            // Use stored percentage if available, otherwise calculate from amount
            const percentage = split.percentage ?? ((split.amount / editingExpense.amount) * 100);
            if (userId) {
              splitsMap[String(userId)] = String(percentage);
            }
          });
          setCustomSplits(splitsMap);
        } else {
          // Default to AMOUNT mode
          setCustomSplitMode('AMOUNT');
          const splitsMap = {};
          splits.forEach(split => {
            const userId = split.user_id || split.UserID;
            const splitAmount = split.amount || split.Amount || 0;
            if (userId) {
              splitsMap[String(userId)] = String(splitAmount);
            }
          });
          setCustomSplits(splitsMap);
        }
      }

      // Store initial values for change detection
      // For app, use 'none' as default when no app is set (matches APPS[0].id)
      const initialAppId = editingExpense.app_name || 'none';
      setInitialValues({
        title: editingExpense.title || '',
        amount: String(editingExpense.amount || ''),
        date: editingExpense.date ? new Date(editingExpense.date).toISOString().split('T')[0] : '',
        categoryId: Number(editingExpense.category_id),
        appId: initialAppId,
        orderReference: editingExpense.reference_id || '',
        splitType: normalizedSplitType,
        existingAttachmentsCount: editingExpense.attachments?.length || 0,
      });

      // Allow mode changes to clear values after initial load completes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 200);
    } else {
      // New expense - allow clearing immediately
      isInitialLoadRef.current = false;
      setInitialValues(null);
    }
  }, [isEditMode, editingExpense, currentGroup]);

  // Check if form has valid data for save
  const canSave = (() => {
    // Required fields check
    const hasRequiredFields = title.trim() && amount && parseFloat(amount) > 0;
    if (!hasRequiredFields) return false;

    if (isEditMode && initialValues) {
      // Edit mode: check if anything changed
      const currentDateStr = selectedDate.toISOString().split('T')[0];

      const hasChanges =
        title.trim() !== initialValues.title ||
        amount !== initialValues.amount ||
        currentDateStr !== initialValues.date ||
        selectedCategory.id !== initialValues.categoryId ||
        selectedApp.id !== initialValues.appId ||
        orderReference !== initialValues.orderReference ||
        splitType !== initialValues.splitType ||
        attachments.length > 0 || // New attachments added
        existingAttachments.length !== initialValues.existingAttachmentsCount; // Attachments removed

      return hasChanges;
    }

    // Create mode: just need required fields (already checked above)
    return true;
  })();

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToast('Permission required', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([...attachments, {
        uri: result.assets[0].uri,
        type: result.assets[0].type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `file_${Date.now()}.${result.assets[0].type === 'video' ? 'mp4' : 'jpg'}`,
      }]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setAttachments([...attachments, {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name || `file_${Date.now()}`,
        }]);
      }
    } catch (error) {
      showToast('Failed to pick document', 'error');
    }
  };

  const handlePickFile = () => {
    if (Platform.OS === 'web') {
      // On web, use document picker directly
      handlePickDocument();
    } else {
      setShowFileActionSheet(true);
    }
  };

  const confirmRemoveAttachment = (index, name) => {
    setAttachmentToDelete({ type: 'new', index, name });
  };

  const confirmRemoveExistingAttachment = (attachmentId, name) => {
    setAttachmentToDelete({ type: 'existing', id: attachmentId, name });
  };

  const performAttachmentDelete = async () => {
    if (!attachmentToDelete) return;

    if (attachmentToDelete.type === 'new') {
      setAttachments(attachments.filter((_, i) => i !== attachmentToDelete.index));
      showToast('Attachment removed', 'success');
    } else {
      try {
        await apiClient.delete(`/attachments/${attachmentToDelete.id}`);
        setExistingAttachments(existingAttachments.filter(a => a.id !== attachmentToDelete.id));
        showToast('Attachment deleted', 'success');
      } catch (error) {
        showToast('Failed to delete attachment', 'error');
      }
    }
    setAttachmentToDelete(null);
  };

  const viewAttachment = async (attachment) => {
    const fileType = attachment.file_type?.toLowerCase() || '';
    const fileName = attachment.file_name?.toLowerCase() || '';
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext =>
      fileType.includes(ext.replace('.', '')) || fileName.endsWith(ext)
    );
    const isPdf = fileType.includes('pdf') || fileName.endsWith('.pdf');

    console.log('Viewing attachment:', { fileType, fileName, isImage, isPdf });

    setLoadingFile(true);

    try {
      const token = await storage.getItem('access_token');
      const downloadUrl = `${BASE_URL}/api/v1/attachments/${attachment.id}/download`;

      if (isImage) {
        // Fetch image with auth and convert to base64
        const response = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load image');

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
          setLoadingFile(false);
        };
        reader.readAsDataURL(blob);
      } else if (isPdf) {
        if (Platform.OS === 'web') {
          // Fetch PDF with auth and create blob URL for web
          const response = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error(`Failed to load PDF: ${response.status}`);

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setPdfPreview({ url: blobUrl, fileName: attachment.file_name });
          setLoadingFile(false);
        } else {
          // On mobile, download to cache and open with system viewer
          const fileUri = `${FileSystem.cacheDirectory}${attachment.file_name}`;

          const downloadResult = await FileSystem.downloadAsync(
            downloadUrl,
            fileUri,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (downloadResult.status !== 200) {
            throw new Error('Failed to download PDF');
          }

          setLoadingFile(false);

          if (Platform.OS === 'android') {
            // On Android, use IntentLauncher to open the file
            const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: 'application/pdf',
            });
          } else {
            // On iOS, use sharing which allows "Open in..." option
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(downloadResult.uri, {
                mimeType: 'application/pdf',
                UTI: 'com.adobe.pdf',
              });
            } else {
              showToast('Cannot open PDF on this device', 'error');
            }
          }
        }
      } else {
        // For other files, download and show info
        showToast(`File: ${attachment.file_name}`, 'info');
        setLoadingFile(false);
      }
    } catch (error) {
      console.error('viewAttachment error:', error);
      showToast(`Failed to load file: ${error.message}`, 'error');
      setLoadingFile(false);
    }
  };

  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  };

  const handleConfirmDate = (date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handleCancelDate = () => {
    setShowDatePicker(false);
  };

  const handleDeleteExpense = () => {
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    const result = await deleteExpense(editingExpense.id);
    if (result.success) {
      showToast('Expense deleted', 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Description is required', 'error');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      showToast('Valid amount is required', 'error');
      return;
    }

    if (!groupId && !isEditMode) {
      showToast('Group ID is missing', 'error');
      return;
    }

    if (splitType === 'CUSTOM' && customSplitMode === 'SINGLE' && !selectedMember) {
      showToast('Please select a member', 'error');
      return;
    }

    const expenseData = {
      title,
      amount: amountNum,
      group_id: groupId || editingExpense.group_id,
      category_id: selectedCategory.id,
      split_type: splitType,
      split_mode: splitType === 'CUSTOM' ? customSplitMode : '',
      paid_by_id: user.id,
      date: selectedDate.toISOString(),
      app_name: selectedApp.id !== 'none' ? selectedApp.id : '',
      reference_id: orderReference,
    };

    // Handle custom splits
    if (splitType === 'CUSTOM') {
      if (customSplitMode === 'SINGLE' && selectedMember) {
        expenseData.splits = [{
          user_id: selectedMember.id,
          amount: amountNum,
        }];
      } else if (customSplitMode === 'AMOUNT') {
        expenseData.splits = Object.entries(customSplits).map(([userId, amount]) => ({
          user_id: parseInt(userId),
          amount: parseFloat(amount) || 0,
        })).filter(split => split.amount > 0);

        if (expenseData.splits.length === 0) {
          showToast('Please enter split amounts', 'error');
          return;
        }

        const totalSplit = expenseData.splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplit - amountNum) > 0.01) {
          showToast(`Split total (₹${totalSplit.toFixed(2)}) must equal expense amount (₹${amountNum.toFixed(2)})`, 'error');
          return;
        }
      } else if (customSplitMode === 'PERCENTAGE') {
        const totalPercentage = Object.values(customSplits).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0) {
          showToast(`Total percentage (${totalPercentage.toFixed(1)}%) must equal 100%`, 'error');
          return;
        }

        // Include both percentage and calculated amount
        expenseData.splits = Object.entries(customSplits).map(([userId, percentage]) => {
          const pct = parseFloat(percentage) || 0;
          return {
            user_id: parseInt(userId),
            amount: (amountNum * pct) / 100,
            percentage: pct,
          };
        }).filter(split => split.amount > 0);

        if (expenseData.splits.length === 0) {
          showToast('Please enter split percentages', 'error');
          return;
        }
      }
    }

    let result;
    if (isEditMode) {
      result = await updateExpense(editingExpense.id, expenseData, attachments);
    } else {
      result = await createExpense(expenseData, attachments);
    }

    if (result.success) {
      showToast(isEditMode ? 'Expense updated successfully' : 'Expense created successfully', 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } else {
      showToast(result.error, 'error');
    }
  };

  // Show loading while fetching expense data
  if (fetchingExpense) {
    return <Loader fullScreen />;
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
              onPress={() => navigation.goBack()}
              variant="glass"
            />
            {isEditMode && (
              <TouchableOpacity
                style={styles.headerDeleteButton}
                onPress={handleDeleteExpense}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error || '#ef4444'} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditMode ? 'Edit Expense' : 'New Expense'}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{currentGroup?.name || 'Group'}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.headerSaveButton,
              { backgroundColor: canSave ? accent.primary : colors.textMuted },
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !canSave}
          >
            {isLoading ? (
              <Text style={styles.headerSaveText}>...</Text>
            ) : (
              <Ionicons name="checkmark" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
          {/* Amount Section - Prominent */}
          <CardGlass style={styles.amountCard}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencySymbol, { color: accent.primary }]}>₹</Text>
              <AppInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                style={styles.amountInputWrapper}
                containerStyle={styles.amountInputContainerStyle}
                inputStyle={[styles.amountInputText, { color: colors.textPrimary }]}
              />
            </View>
            {amount && parseFloat(amount) > 0 && (
              <Text style={[styles.amountInWords, { color: colors.textMuted }]}>
                {parseFloat(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </Text>
            )}
          </CardGlass>

          {/* Basic Info Section */}
          <CardGlass style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Information</Text>

            <AppInput
              label="Description"
              value={title}
              onChangeText={setTitle}
              placeholder="What's this expense for?"
              style={styles.input}
            />

            <View style={styles.selectorGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.selector}>
                  <Ionicons name="calendar-outline" size={24} color={colors.textPrimary} style={styles.selectorIconIon} />
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="web-date-input"
                  />
                  <style dangerouslySetInnerHTML={{__html: `
                    .web-date-input {
                      flex: 1;
                      border: none;
                      background: transparent;
                      color: ${colors.textPrimary};
                      font-size: 16px;
                      font-weight: 500;
                      outline: none;
                      cursor: pointer;
                      padding: 0;
                      margin-left: 12px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    }
                    .web-date-input::-webkit-calendar-picker-indicator {
                      cursor: pointer;
                      opacity: 0.6;
                      filter: invert(1);
                    }
                    .web-date-input::-webkit-calendar-picker-indicator:hover {
                      opacity: 1;
                    }
                  `}} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.selectorContent}>
                    <Ionicons name="calendar-outline" size={24} color={colors.textPrimary} style={styles.selectorIconIon} />
                    <Text style={[styles.selectorText, { color: colors.textPrimary }]}>{formatDate(selectedDate)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.selectorGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setCategoryModalVisible(true)}
              >
                <View style={styles.selectorContent}>
                  <Text style={styles.selectorIcon}>{selectedCategory.icon}</Text>
                  <Text style={[styles.selectorText, { color: colors.textPrimary }]}>{selectedCategory.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </CardGlass>

          {/* Order Details Section - Collapsible */}
          <TouchableOpacity
            style={[styles.collapsibleHeader, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}
            onPress={() => toggleSection('order')}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons name="receipt-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>Order Details</Text>
              <Text style={[styles.collapsibleOptional, { color: colors.textMuted }]}>(Optional)</Text>
            </View>
            <Ionicons
              name={showOrderDetails ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showOrderDetails && (
            <CardGlass style={styles.collapsibleContent}>
              <View style={styles.selectorGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>App/Platform</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setAppModalVisible(true)}
                >
                  <View style={styles.selectorContent}>
                    <View style={[styles.appIconContainer, { backgroundColor: selectedApp.color + '20' }]}>
                      {selectedApp.icon ? (
                        <Image
                          source={{ uri: selectedApp.icon }}
                          style={styles.appLogoImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="phone-portrait-outline" size={20} color={colors.textPrimary} />
                      )}
                    </View>
                    <Text style={[styles.selectorText, { color: colors.textPrimary }]}>{selectedApp.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedApp.id !== 'none' && (
                <AppInput
                  label="Order Reference"
                  value={orderReference}
                  onChangeText={setOrderReference}
                  placeholder="e.g., Order #12345"
                  style={styles.input}
                />
              )}
            </CardGlass>
          )}

          {/* Split Configuration - Collapsible */}
          <TouchableOpacity
            style={[styles.collapsibleHeader, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}
            onPress={() => toggleSection('split')}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons name="git-compare-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>Split Configuration</Text>
              <View style={[styles.collapsibleBadge, { backgroundColor: accent.primary }]}>
                <Text style={[styles.collapsibleBadgeText, { color: '#fff' }]}>{SPLIT_TYPES.find(s => s.value === splitType)?.label}</Text>
              </View>
            </View>
            <Ionicons
              name={showSplitConfig ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showSplitConfig && (
            <CardGlass style={styles.collapsibleContent}>
              <View style={styles.selectorGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Split Type</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  onPress={() => setSplitModalVisible(true)}
                >
                  <View style={styles.selectorContent}>
                    <View style={[styles.selectorIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                      <Ionicons
                        name={splitType === 'EQUAL' ? 'git-compare-outline' : 'create-outline'}
                        size={20}
                        color={colors.textPrimary}
                      />
                    </View>
                    <View style={styles.selectorTextContainer}>
                      <Text style={[styles.selectorText, { color: colors.textPrimary }]}>
                        {SPLIT_TYPES.find(s => s.value === splitType)?.label}
                      </Text>
                      <Text style={[styles.selectorDesc, { color: colors.textMuted }]}>
                        {SPLIT_TYPES.find(s => s.value === splitType)?.desc}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {splitType === 'CUSTOM' && (
                <>
                  <View style={styles.selectorGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Split Mode</Text>
                    <TouchableOpacity
                      style={[styles.selector, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                      onPress={() => setCustomSplitModalVisible(true)}
                    >
                      <View style={styles.selectorContent}>
                        <View style={[styles.selectorIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                          <Ionicons
                            name={customSplitMode === 'AMOUNT' ? 'cash-outline' : customSplitMode === 'PERCENTAGE' ? 'pie-chart-outline' : 'person-outline'}
                            size={20}
                            color={colors.textPrimary}
                          />
                        </View>
                        <View style={styles.selectorTextContainer}>
                          <Text style={[styles.selectorText, { color: colors.textPrimary }]}>
                            {CUSTOM_SPLIT_MODES.find(m => m.value === customSplitMode)?.label}
                          </Text>
                          <Text style={[styles.selectorDesc, { color: colors.textMuted }]}>
                            {CUSTOM_SPLIT_MODES.find(m => m.value === customSplitMode)?.desc}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {(customSplitMode === 'AMOUNT' || customSplitMode === 'PERCENTAGE') && (
                    <View style={styles.customSplitInputs}>
                      <View style={styles.splitHeaderRow}>
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                          Split {customSplitMode === 'AMOUNT' ? 'Amounts' : 'Percentages'}
                        </Text>
                        <View style={styles.splitActions}>
                          <TouchableOpacity
                            style={styles.splitActionButton}
                            onPress={distributeEqually}
                          >
                            <Ionicons name="git-compare-outline" size={14} color={accent.primary} />
                            <Text style={[styles.splitActionText, { color: accent.primary }]}>Equal</Text>
                          </TouchableOpacity>
                          {Object.keys(customSplits).length > 0 && (
                            <TouchableOpacity
                              style={styles.splitActionButton}
                              onPress={resetSplits}
                            >
                              <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                              <Text style={[styles.splitActionText, { color: colors.textMuted }]}>Reset</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {currentGroup?.members?.map((member) => {
                        const memberValue = customSplits[member.id] || '';
                        const hasValue = memberValue && parseFloat(memberValue) > 0;
                        const percentage = customSplitMode === 'PERCENTAGE' ? parseFloat(memberValue) || 0 : 0;
                        const calculatedAmount = customSplitMode === 'PERCENTAGE' && amount
                          ? (parseFloat(amount) * percentage / 100)
                          : 0;
                        const remaining = getRemainingValue();
                        const showFillButton = !hasValue && remaining && remaining.value > 0;

                        return (
                          <View key={member.id} style={styles.splitInputRow}>
                            <View style={styles.splitMemberInfo}>
                              {member.avatar_url ? (
                                <Image
                                  source={{ uri: member.avatar_url.startsWith('http') ? member.avatar_url : `${BASE_URL}${member.avatar_url}` }}
                                  style={styles.splitAvatarImage}
                                />
                              ) : (
                                <View style={[styles.splitAvatar, { backgroundColor: accent.primary }]}>
                                  <Text style={[styles.splitAvatarText, { color: '#fff' }]}>
                                    {member.name?.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <View style={styles.splitMemberNameContainer}>
                                <Text style={[styles.splitMemberName, { color: colors.textPrimary }]}>{member.name}</Text>
                                {customSplitMode === 'PERCENTAGE' && percentage > 0 && amount && parseFloat(amount) > 0 && (
                                  <Text style={[styles.splitCalculatedAmount, { color: colors.textMuted }]}>
                                    = ₹{formatSplitValue(calculatedAmount)}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.splitInputWrapper}>
                              {showFillButton && (
                                <TouchableOpacity
                                  style={[styles.fillRemainingButton, { backgroundColor: `${accent.primary}20`, borderColor: `${accent.primary}40` }]}
                                  onPress={() => fillRemainingForMember(member.id)}
                                >
                                  <Text style={[styles.fillRemainingText, { color: accent.primary }]}>
                                    +{customSplitMode === 'AMOUNT' ? '₹' : ''}{remaining.formatted}{customSplitMode === 'PERCENTAGE' ? '%' : ''}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <View style={styles.splitInputContainer}>
                                {customSplitMode === 'AMOUNT' && (
                                  <Text style={[styles.splitInputPrefix, { color: colors.textSecondary }]}>₹</Text>
                                )}
                                <AppInput
                                  value={memberValue.toString()}
                                  onChangeText={(value) => handleCustomSplitChange(member.id, value)}
                                  placeholder="0"
                                  keyboardType="decimal-pad"
                                  style={styles.splitInput}
                                  inputStyle={[styles.splitInputText, { color: colors.textPrimary }]}
                                />
                                {customSplitMode === 'PERCENTAGE' && (
                                  <Text style={[styles.splitInputSuffix, { color: colors.textSecondary }]}>%</Text>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {/* Summary section */}
                      {(() => {
                        const total = Object.values(customSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                        const remaining = getRemainingValue();
                        const isComplete = customSplitMode === 'AMOUNT'
                          ? Math.abs(total - parseFloat(amount || 0)) < 0.01
                          : Math.abs(total - 100) < 0.01;

                        return (
                          <View style={[styles.splitSummary, { backgroundColor: colors.glass, borderColor: colors.glassBorder }, isComplete && styles.splitSummaryComplete]}>
                            {customSplitMode === 'AMOUNT' ? (
                              <View style={styles.splitSummaryContent}>
                                <Text style={[styles.splitSummaryText, { color: colors.textSecondary }]}>
                                  Total: ₹{formatSplitValue(total)} / ₹{formatSplitValue(parseFloat(amount) || 0)}
                                </Text>
                                {remaining && Math.abs(remaining.value) > 0.01 && (
                                  <Text style={[styles.splitRemainingText, remaining.value < 0 && styles.splitOverText]}>
                                    {remaining.value > 0 ? `Remaining: ₹${remaining.formatted}` : `Over by: ₹${formatSplitValue(Math.abs(remaining.value))}`}
                                  </Text>
                                )}
                                {isComplete && (
                                  <View style={styles.splitCompleteIndicator}>
                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                    <Text style={styles.splitCompleteText}>Splits complete</Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={styles.splitSummaryContent}>
                                <View style={styles.splitSummaryRow}>
                                  <Text style={[styles.splitSummaryText, { color: colors.textSecondary }]}>
                                    Total: {formatSplitValue(total, true)}% / 100%
                                  </Text>
                                  {amount && parseFloat(amount) > 0 && (
                                    <Text style={[styles.splitSummaryAmount, { color: accent.primary }]}>
                                      = ₹{formatSplitValue(parseFloat(amount) * total / 100)}
                                    </Text>
                                  )}
                                </View>
                                {remaining && Math.abs(remaining.value) > 0.01 && (
                                  <Text style={[styles.splitRemainingText, remaining.value < 0 && styles.splitOverText]}>
                                    {remaining.value > 0 ? `Remaining: ${remaining.formatted}%` : `Over by: ${formatSplitValue(Math.abs(remaining.value), true)}%`}
                                  </Text>
                                )}
                                {isComplete && (
                                  <View style={styles.splitCompleteIndicator}>
                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                    <Text style={styles.splitCompleteText}>Splits complete</Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {customSplitMode === 'SINGLE' && (
                    <View style={styles.selectorGroup}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Select Member</Text>
                      <TouchableOpacity
                        style={[styles.selector, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                        onPress={() => setMemberModalVisible(true)}
                      >
                        <View style={styles.selectorContent}>
                          {selectedMember ? (
                            <>
                              {selectedMember.avatar_url ? (
                                <Image
                                  source={{ uri: selectedMember.avatar_url.startsWith('http') ? selectedMember.avatar_url : `${BASE_URL}${selectedMember.avatar_url}` }}
                                  style={styles.miniAvatarImage}
                                />
                              ) : (
                                <View style={[styles.miniAvatar, { backgroundColor: accent.primary }]}>
                                  <Text style={[styles.miniAvatarText, { color: '#fff' }]}>
                                    {selectedMember.name?.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <Text style={[styles.selectorText, { color: colors.textPrimary }]}>{selectedMember.name}</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="person-outline" size={24} color={colors.textMuted} style={styles.selectorIconIon} />
                              <Text style={[styles.selectorText, styles.placeholderText]}>
                                Choose who owes
                              </Text>
                            </>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </CardGlass>
          )}

          {/* Attachments - Collapsible */}
          <TouchableOpacity
            style={[styles.collapsibleHeader, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}
            onPress={() => toggleSection('attachments')}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleLeft}>
              <Ionicons name="attach-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>Attachments</Text>
              {(existingAttachments.length > 0 || attachments.length > 0) && (
                <View style={[styles.collapsibleBadge, { backgroundColor: accent.primary }]}>
                  <Text style={[styles.collapsibleBadgeText, { color: '#fff' }]}>{existingAttachments.length + attachments.length}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={showAttachments ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showAttachments && (
            <CardGlass style={styles.collapsibleContent}>
              <AppButton
                title="Add Attachment"
                onPress={handlePickFile}
                variant="outline"
                icon={<Ionicons name="attach-outline" size={20} color={accent.primary} />}
                style={styles.attachmentButton}
              />

              {/* Existing attachments (from server) */}
              {existingAttachments.length > 0 && (
                <View style={styles.attachmentList}>
                  {existingAttachments.map((attachment) => (
                    <View key={attachment.id} style={styles.attachmentItem}>
                      <TouchableOpacity
                        style={styles.attachmentContent}
                        onPress={() => viewAttachment(attachment)}
                      >
                        <Ionicons
                          name={['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(attachment.file_type?.toLowerCase()) ? 'image-outline' : 'document-outline'}
                          size={20}
                          color={colors.textPrimary}
                          style={styles.attachmentIconIon}
                        />
                        <Text style={[styles.attachmentName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {attachment.file_name}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmRemoveExistingAttachment(attachment.id, attachment.file_name)}>
                        <Ionicons name="close" size={20} color={colors.error || '#ef4444'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* New attachments (to upload) */}
              {attachments.length > 0 && (
                <View style={styles.attachmentList}>
                  {attachments.map((file, index) => (
                    <View key={`new-${index}`} style={styles.attachmentItem}>
                      <Ionicons name="attach-outline" size={20} color={colors.textPrimary} style={styles.attachmentIconIon} />
                      <Text style={[styles.attachmentName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity onPress={() => confirmRemoveAttachment(index, file.name)}>
                        <Ionicons name="close" size={20} color={colors.error || '#ef4444'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </CardGlass>
          )}

          <AppButton
            title={isEditMode ? 'Update Expense' : 'Create Expense'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!canSave}
            style={styles.submitButton}
          />
        </ScrollView>

        {/* Date Picker - Mobile Only */}
        {Platform.OS !== 'web' && (
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={selectedDate}
            onConfirm={handleConfirmDate}
            onCancel={handleCancelDate}
            maximumDate={new Date()}
            isDarkModeEnabled={true}
          />
        )}

        {/* Category Modal */}
        <Modal
          visible={categoryModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <CardGlass style={styles.categoryModalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Category</Text>
                <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ maxHeight: 450 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={{
                        width: '30%',
                        backgroundColor: selectedCategory.id === category.id ? `${accent.primary}30` : 'rgba(255, 255, 255, 0.1)',
                        borderWidth: selectedCategory.id === category.id ? 2 : 1,
                        borderColor: selectedCategory.id === category.id ? accent.primary : 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 12,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        minHeight: 80,
                      }}
                      onPress={() => {
                        setSelectedCategory(category);
                        setCategoryModalVisible(false);
                      }}
                    >
                      <Text style={{ fontSize: 28, marginBottom: 4 }}>{category.icon}</Text>
                      <Text style={{ fontSize: 11, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' }}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </CardGlass>
          </View>
        </Modal>

        {/* App Modal */}
        <Modal
          visible={appModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAppModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <CardGlass style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select App/Platform</Text>
                <TouchableOpacity onPress={() => setAppModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.appList} showsVerticalScrollIndicator={false}>
                {APPS.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.listItem,
                      selectedApp.id === app.id && { borderColor: accent.primary, borderWidth: 2, backgroundColor: `${accent.primary}10` },
                    ]}
                    onPress={() => {
                      setSelectedApp(app);
                      setAppModalVisible(false);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <View style={[styles.appIconContainer, { backgroundColor: app.color + '20' }]}>
                        {app.icon ? (
                          <Image
                            source={{ uri: app.icon }}
                            style={styles.appLogoImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={{ fontSize: 20 }}>📱</Text>
                        )}
                      </View>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>{app.name}</Text>
                    </View>
                    {selectedApp.id === app.id && <Ionicons name="checkmark" size={20} color={accent.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </CardGlass>
          </View>
        </Modal>

        {/* Split Type Modal */}
        <Modal
          visible={splitModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSplitModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <CardGlass style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Split Type</Text>
                <TouchableOpacity onPress={() => setSplitModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {SPLIT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.listItem,
                    splitType === type.value && { borderColor: accent.primary, borderWidth: 2, backgroundColor: `${accent.primary}10` },
                  ]}
                  onPress={() => {
                    setSplitType(type.value);
                    setSplitModalVisible(false);
                  }}
                >
                  <View style={styles.listItemContent}>
                    <View style={[styles.listItemIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                      <Ionicons
                        name={type.value === 'EQUAL' ? 'git-compare-outline' : 'create-outline'}
                        size={20}
                        color={colors.textPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>{type.label}</Text>
                      <Text style={[styles.listItemDesc, { color: colors.textMuted }]}>{type.desc}</Text>
                    </View>
                  </View>
                  {splitType === type.value && <Ionicons name="checkmark" size={20} color={accent.primary} />}
                </TouchableOpacity>
              ))}
            </CardGlass>
          </View>
        </Modal>

        {/* Custom Split Mode Modal */}
        <Modal
          visible={customSplitModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCustomSplitModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <CardGlass style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Custom Split Mode</Text>
                <TouchableOpacity onPress={() => setCustomSplitModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {CUSTOM_SPLIT_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.listItem,
                    customSplitMode === mode.value && { borderColor: accent.primary, borderWidth: 2, backgroundColor: `${accent.primary}10` },
                  ]}
                  onPress={() => {
                    setCustomSplitMode(mode.value);
                    setCustomSplitModalVisible(false);
                  }}
                >
                  <View style={styles.listItemContent}>
                    <View style={[styles.listItemIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                      <Ionicons
                        name={mode.value === 'AMOUNT' ? 'cash-outline' : mode.value === 'PERCENTAGE' ? 'pie-chart-outline' : 'person-outline'}
                        size={20}
                        color={colors.textPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>{mode.label}</Text>
                      <Text style={[styles.listItemDesc, { color: colors.textMuted }]}>{mode.desc}</Text>
                    </View>
                  </View>
                  {customSplitMode === mode.value && <Ionicons name="checkmark" size={20} color={accent.primary} />}
                </TouchableOpacity>
              ))}
            </CardGlass>
          </View>
        </Modal>

        {/* Member Selection Modal */}
        <Modal
          visible={memberModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMemberModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <CardGlass style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Member</Text>
                <TouchableOpacity onPress={() => setMemberModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
                {currentGroup?.members?.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberItem,
                        isSelected && { borderColor: accent.primary, borderWidth: 2, backgroundColor: `${accent.primary}10` },
                      ]}
                      onPress={() => {
                        setSelectedMember(member);
                        setMemberModalVisible(false);
                      }}
                    >
                      <View style={styles.memberItemContent}>
                        {member.avatar_url ? (
                          <Image
                            source={{ uri: member.avatar_url.startsWith('http') ? member.avatar_url : `${BASE_URL}${member.avatar_url}` }}
                            style={styles.memberAvatarImage}
                          />
                        ) : (
                          <View style={[styles.memberAvatar, { backgroundColor: accent.primary }]}>
                            <Text style={[styles.memberAvatarText, { color: '#fff' }]}>
                              {member.name?.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.name}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={20} color={accent.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </CardGlass>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={!!imagePreview}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setImagePreview(null)}
        >
          <TouchableOpacity
            style={styles.imagePreviewOverlay}
            activeOpacity={1}
            onPress={() => setImagePreview(null)}
          >
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imagePreview }}
                style={styles.imagePreviewImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.imagePreviewClose}
                onPress={() => setImagePreview(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* PDF Preview Modal */}
        <Modal
          visible={!!pdfPreview}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview(null);
          }}
        >
          <View style={styles.pdfPreviewContainer}>
            <View style={styles.pdfPreviewHeader}>
              <Text style={styles.pdfPreviewTitle} numberOfLines={1}>
                {pdfPreview?.fileName || 'Document'}
              </Text>
              <TouchableOpacity
                style={styles.pdfPreviewCloseBtn}
                onPress={() => {
                  if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
                  setPdfPreview(null);
                }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {Platform.OS === 'web' && pdfPreview ? (
              <iframe
                src={`${pdfPreview.url}#toolbar=1`}
                style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
                title="PDF Viewer"
              />
            ) : (
              <View style={styles.pdfFallback}>
                <Ionicons name="document-outline" size={64} color={colors.textMuted} style={styles.pdfFallbackIcon} />
                <Text style={styles.pdfFallbackText}>
                  {pdfPreview?.fileName}
                </Text>
                <Text style={styles.pdfFallbackHint}>
                  Install react-native-webview for in-app PDF viewing.
                  For now, the file opens in your default PDF app.
                </Text>
                <AppButton
                  title="Open PDF"
                  onPress={() => {
                    if (pdfPreview?.url) {
                      Linking.openURL(pdfPreview.url);
                    }
                  }}
                  style={{ marginTop: 20 }}
                />
              </View>
            )}
          </View>
        </Modal>

        {/* Loading overlay */}
        {loadingFile && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          visible={showDeleteModal}
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={() => {
            setShowDeleteModal(false);
            performDelete();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />

        {/* File Picker Action Sheet */}
        <ActionSheet
          visible={showFileActionSheet}
          title="Add Attachment"
          options={[
            { label: 'Photo/Video', icon: 'image-outline', onPress: handlePickImage },
            { label: 'Document', icon: 'document-outline', onPress: handlePickDocument },
          ]}
          onCancel={() => setShowFileActionSheet(false)}
        />

        {/* Delete Attachment Confirmation Modal */}
        <ConfirmModal
          visible={attachmentToDelete !== null}
          title="Delete Attachment"
          message={`Are you sure you want to delete "${attachmentToDelete?.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          icon="document-outline"
          onConfirm={() => {
            performAttachmentDelete();
          }}
          onCancel={() => setAttachmentToDelete(null)}
        />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 50,
  },
  headerDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${staticColors.error || '#ef4444'}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: staticColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: 150,
  },
  amountCard: {
    padding: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: staticColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: staticColors.primary,
    marginRight: spacing.xs,
  },
  amountInputWrapper: {
    marginBottom: 0,
    minWidth: 120,
  },
  amountInputContainerStyle: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 50,
    paddingHorizontal: 0,
  },
  amountInputText: {
    fontSize: 40,
    fontWeight: '700',
    color: staticColors.textPrimary,
    textAlign: 'center',
    minWidth: 100,
  },
  amountInWords: {
    fontSize: 13,
    color: staticColors.textMuted,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: staticColors.textPrimary,
    marginBottom: spacing.lg,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  collapsibleOptional: {
    fontSize: 12,
    color: staticColors.textMuted,
    fontWeight: '400',
  },
  collapsibleBadge: {
    backgroundColor: staticColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  collapsibleBadgeText: {
    fontSize: 12,
    color: staticColors.textPrimary,
    fontWeight: '600',
  },
  collapsibleContent: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  selectorGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: staticColors.textSecondary,
    marginBottom: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: staticColors.glass,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 56,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  selectorIconIon: {
    marginRight: spacing.md,
  },
  selectorIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: staticColors.textPrimary,
    fontWeight: '500',
  },
  selectorDesc: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  placeholderText: {
    color: staticColors.textMuted,
    fontWeight: '400',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  miniAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.sm,
  },
  miniAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  customSplitInputs: {
    marginTop: spacing.md,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  splitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  splitActionText: {
    fontSize: 12,
    color: staticColors.primary,
    fontWeight: '600',
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  splitMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  splitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  splitAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  splitAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  splitMemberName: {
    fontSize: 14,
    color: staticColors.textPrimary,
    fontWeight: '500',
  },
  splitMemberNameContainer: {
    flexDirection: 'column',
  },
  splitCalculatedAmount: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  splitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fillRemainingButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${staticColors.primary}20`,
    borderWidth: 1,
    borderColor: `${staticColors.primary}40`,
  },
  fillRemainingText: {
    fontSize: 11,
    color: staticColors.primary,
    fontWeight: '600',
  },
  splitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  splitInputPrefix: {
    fontSize: 16,
    color: staticColors.textSecondary,
    marginRight: spacing.xs,
  },
  splitInputSuffix: {
    fontSize: 16,
    color: staticColors.textSecondary,
    marginLeft: spacing.xs,
  },
  splitInput: {
    flex: 1,
    marginBottom: 0,
  },
  splitInputText: {
    textAlign: 'right',
    fontSize: 16,
  },
  splitSummary: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: staticColors.glass,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  splitSummaryComplete: {
    borderColor: '#10B98140',
    backgroundColor: '#10B98110',
  },
  splitSummaryContent: {
    alignItems: 'center',
    gap: 4,
  },
  splitSummaryText: {
    fontSize: 13,
    color: staticColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  splitSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splitSummaryAmount: {
    fontSize: 13,
    color: staticColors.primary,
    fontWeight: '600',
  },
  splitRemainingText: {
    fontSize: 12,
    color: staticColors.accent || '#F59E0B',
    fontWeight: '500',
  },
  splitOverText: {
    color: staticColors.error || '#EF4444',
  },
  splitCompleteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  splitCompleteText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  attachmentButton: {
    marginTop: spacing.sm,
  },
  attachmentList: {
    marginTop: spacing.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.glass,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  attachmentIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  attachmentIconIon: {
    marginRight: spacing.sm,
  },
  attachmentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentName: {
    flex: 1,
    color: staticColors.textPrimary,
    fontSize: 14,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  categoryModalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: staticColors.textPrimary,
  },
  categoryScrollView: {
    maxHeight: 500,
  },
  categoryScrollContent: {
    paddingBottom: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 85,
  },
  categoryItemSelected: {
    borderColor: staticColors.primary,
    borderWidth: 2,
    backgroundColor: `${staticColors.primary}15`,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: staticColors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  appList: {
    maxHeight: 300,
  },
  appIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  appLogoImage: {
    width: 32,
    height: 32,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: staticColors.glass,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  listItemSelected: {
    borderColor: staticColors.primary,
    borderWidth: 2,
    backgroundColor: `${staticColors.primary}10`,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  listItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listItemText: {
    fontSize: 16,
    color: staticColors.textPrimary,
    fontWeight: '500',
  },
  listItemDesc: {
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  memberList: {
    maxHeight: 350,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: staticColors.glass,
    borderWidth: 1,
    borderColor: staticColors.glassBorder,
  },
  memberItemSelected: {
    borderColor: staticColors.primary,
    borderWidth: 2,
    backgroundColor: `${staticColors.primary}10`,
  },
  memberItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
  },
  memberName: {
    fontSize: 16,
    color: staticColors.textPrimary,
    fontWeight: '500',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfPreviewContainer: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  pdfPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    backgroundColor: staticColors.glass,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.glassBorder,
  },
  pdfPreviewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.textPrimary,
    marginRight: spacing.md,
  },
  pdfPreviewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: staticColors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pdfFallbackIcon: {
    marginBottom: spacing.lg,
  },
  pdfFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: staticColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pdfFallbackHint: {
    fontSize: 14,
    color: staticColors.textMuted,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: staticColors.glass,
    padding: spacing.xl,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    color: staticColors.textPrimary,
    fontWeight: '500',
  },
});

export default AddExpenseScreen;
