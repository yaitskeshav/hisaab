import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import SectionContainer from '../../components/common/SectionContainer';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import apiClient from '../../api/client';

const screenWidth = Dimensions.get('window').width - spacing.lg * 2;

const AnalyticsScreen = ({ route }) => {
  const { groupId } = route.params || {};
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [groupId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/analytics/group/${groupId}`);
      setAnalytics(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await apiClient.get(`/io/export/csv/${groupId}`, {
        responseType: 'blob',
      });
      // Handle file download (platform-specific)
      console.log('Exporting CSV...');
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportXLSX = async () => {
    try {
      const response = await apiClient.get(`/io/export/xlsx/${groupId}`);
      console.log('Exporting XLSX...');
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  // Mock data for charts (replace with real analytics data)
  const categoryData = [
    { name: 'Food', population: 3500, color: '#0F4C75', legendFontColor: '#BBE1FA' },
    { name: 'Transport', population: 2000, color: '#3282B8', legendFontColor: '#BBE1FA' },
    { name: 'Entertainment', population: 1500, color: '#BBE1FA', legendFontColor: '#BBE1FA' },
    { name: 'Bills', population: 2500, color: '#1B262C', legendFontColor: '#BBE1FA' },
  ];

  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [2000, 4500, 2800, 5000, 4200, 3500],
    }],
  };

  const dailyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [300, 500, 400, 700, 600, 800, 450],
    }],
  };

  const chartConfig = {
    backgroundColor: colors.backgroundLight,
    backgroundGradientFrom: colors.backgroundLight,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(50, 130, 184, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(187, 225, 250, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Summary Stats */}
        <SectionContainer title="Summary">
          <View style={styles.statsRow}>
            <CardGlass gradient style={styles.statCard}>
              <Text style={styles.statValue}>₹9,500</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </CardGlass>
            <CardGlass gradient style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Expenses</Text>
            </CardGlass>
          </View>
        </SectionContainer>

        {/* Category Breakdown (Pie Chart) */}
        <SectionContainer title="By Category">
          <CardGlass style={styles.chartCard}>
            <PieChart
              data={categoryData}
              width={screenWidth - spacing.lg * 2}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </CardGlass>
        </SectionContainer>

        {/* Monthly Trend (Line Chart) */}
        <SectionContainer title="Monthly Trend">
          <CardGlass style={styles.chartCard}>
            <LineChart
              data={monthlyData}
              width={screenWidth - spacing.lg * 2}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </CardGlass>
        </SectionContainer>

        {/* Daily Expenses (Bar Chart) */}
        <SectionContainer title="This Week">
          <CardGlass style={styles.chartCard}>
            <BarChart
              data={dailyData}
              width={screenWidth - spacing.lg * 2}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </CardGlass>
        </SectionContainer>

        {/* Export Options */}
        <SectionContainer title="Export Data">
          <View style={styles.exportButtons}>
            <AppButton
              title="Export CSV"
              onPress={handleExportCSV}
              variant="outline"
              icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
              style={styles.exportButton}
            />
            <AppButton
              title="Export XLSX"
              onPress={handleExportXLSX}
              variant="outline"
              icon={<Ionicons name="grid-outline" size={20} color={colors.primary} />}
              style={styles.exportButton}
            />
          </View>
        </SectionContainer>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    paddingTop: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chartCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportButton: {
    flex: 1,
  },
});

export default AnalyticsScreen;
