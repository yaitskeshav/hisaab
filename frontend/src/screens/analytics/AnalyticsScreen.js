import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import Loader from '../../components/common/Loader';
import useAnalyticsStore, { ANALYTICS_SECTIONS, ANALYTICS_PERIODS } from '../../store/analyticsStore';
import { useAccentColor } from '../../store/themeStore';
import { formatCurrency } from '../../utils/currency';

const screenWidth = Dimensions.get('window').width - spacing.lg * 2;

const SECTION_CONFIG = {
  overview: { label: 'Overview', icon: 'stats-chart' },
  categories: { label: 'Categories', icon: 'pie-chart' },
  members: { label: 'Members', icon: 'people' },
  trends: { label: 'Trends', icon: 'trending-up' },
  personal: { label: 'Personal', icon: 'person' },
  settlements: { label: 'Settlements', icon: 'wallet' },
};

const PERIOD_LABELS = {
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

const AnalyticsScreen = ({ route, navigation }) => {
  const { groupId } = route.params || {};
  const accent = useAccentColor();

  const {
    selectedSection,
    selectedPeriods,
    loading,
    errors,
    setSection,
    setPeriod,
    fetchSectionData,
    getCachedData,
    clearGroupCache,
    isCacheValid,
  } = useAnalyticsStore();

  const currentPeriod = selectedPeriods[selectedSection];
  const isLoading = loading[selectedSection];
  const error = errors[selectedSection];
  const data = getCachedData(groupId, selectedSection, currentPeriod);

  // Fetch data when section or period changes
  useEffect(() => {
    if (groupId) {
      fetchSectionData(groupId, selectedSection, currentPeriod);
    }
  }, [groupId, selectedSection, currentPeriod]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    clearGroupCache(groupId);
    await fetchSectionData(groupId, selectedSection, currentPeriod, true);
  }, [groupId, selectedSection, currentPeriod]);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.backgroundLight,
    backgroundGradientTo: colors.backgroundLight,
    decimalPlaces: 0,
    color: (opacity = 1) => accent.primary,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForLabels: { fontSize: 11 },
    propsForBackgroundLines: { stroke: colors.glassBorder },
  };

  // Render section tabs
  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {ANALYTICS_SECTIONS.map((section) => {
        const config = SECTION_CONFIG[section];
        const isSelected = selectedSection === section;
        return (
          <TouchableOpacity
            key={section}
            style={[
              styles.tab,
              isSelected && [styles.tabSelected, { backgroundColor: accent.primary + '20', borderColor: accent.primary }],
            ]}
            onPress={() => setSection(section)}
          >
            <Ionicons
              name={config.icon}
              size={16}
              color={isSelected ? accent.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, isSelected && { color: accent.primary }]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render time filter
  const renderTimeFilter = () => (
    <View style={styles.timeFilterContainer}>
      {ANALYTICS_PERIODS.map((period) => {
        const isSelected = currentPeriod === period;
        return (
          <TouchableOpacity
            key={period}
            style={[
              styles.timeFilter,
              isSelected && [styles.timeFilterSelected, { backgroundColor: accent.primary }],
            ]}
            onPress={() => setPeriod(selectedSection, period)}
          >
            <Text style={[styles.timeFilterText, isSelected && styles.timeFilterTextSelected]}>
              {PERIOD_LABELS[period]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render Overview section
  const renderOverview = () => {
    if (!data) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: accent.primary }]}>
              {formatCurrency(data.total_spent || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: accent.primary }]}>
              {data.expense_count || 0}
            </Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: accent.primary }]}>
              {formatCurrency(data.average_expense || 0)}
            </Text>
            <Text style={styles.statLabel}>Average</Text>
          </CardGlass>
        </View>

        {/* Highest Expense */}
        {data.highest_expense && (
          <CardGlass style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="arrow-up-circle" size={20} color={colors.warning} />
              <Text style={styles.infoCardTitle}>Highest Expense</Text>
            </View>
            <Text style={styles.infoCardValue}>{data.highest_expense.title}</Text>
            <Text style={[styles.infoCardAmount, { color: accent.primary }]}>
              {formatCurrency(data.highest_expense.amount)}
            </Text>
          </CardGlass>
        )}

        {/* Most Used Category */}
        {data.most_used_category && (
          <CardGlass style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.categoryIcon}>{data.most_used_category.icon}</Text>
              <Text style={styles.infoCardTitle}>Most Used Category</Text>
            </View>
            <Text style={styles.infoCardValue}>{data.most_used_category.name}</Text>
            <Text style={styles.infoCardSubtext}>{data.most_used_category.count} expenses</Text>
          </CardGlass>
        )}

        {/* Date Range */}
        {data.date_range && (
          <CardGlass style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="calendar" size={20} color={colors.textMuted} />
              <Text style={styles.infoCardTitle}>Date Range</Text>
            </View>
            <Text style={styles.infoCardValue}>
              {new Date(data.date_range.first).toLocaleDateString()} - {new Date(data.date_range.last).toLocaleDateString()}
            </Text>
          </CardGlass>
        )}
      </View>
    );
  };

  // Render Categories section
  const renderCategories = () => {
    if (!data || !data.categories?.length) {
      return <EmptyState message="No category data available" />;
    }

    const pieData = data.categories.slice(0, 5).map((cat, index) => ({
      name: cat.name,
      amount: cat.amount,
      color: getChartColor(index, accent.primary),
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
    }));

    return (
      <View style={styles.sectionContent}>
        <CardGlass style={styles.chartCard}>
          <PieChart
            data={pieData}
            width={screenWidth - spacing.lg}
            height={200}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </CardGlass>

        {/* Category List */}
        <View style={styles.listContainer}>
          {data.categories.map((cat) => (
            <CardGlass key={cat.id} style={styles.listItem}>
              <Text style={styles.listItemIcon}>{cat.icon}</Text>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{cat.name}</Text>
                <Text style={styles.listItemSubtext}>{cat.count} expenses</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={[styles.listItemAmount, { color: accent.primary }]}>
                  {formatCurrency(cat.amount)}
                </Text>
                <Text style={styles.listItemPercent}>{cat.percentage.toFixed(1)}%</Text>
              </View>
            </CardGlass>
          ))}
        </View>
      </View>
    );
  };

  // Render Members section
  const renderMembers = () => {
    if (!data || !data.members?.length) {
      return <EmptyState message="No member data available" />;
    }

    const barData = {
      labels: data.members.slice(0, 5).map((m) => m.name.split(' ')[0]),
      datasets: [{ data: data.members.slice(0, 5).map((m) => m.paid) }],
    };

    return (
      <View style={styles.sectionContent}>
        {/* Top Spender */}
        {data.top_spender && (
          <CardGlass style={[styles.infoCard, styles.topSpenderCard]}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <View style={styles.topSpenderInfo}>
              <Text style={styles.topSpenderLabel}>Top Spender</Text>
              <Text style={styles.topSpenderName}>{data.top_spender.name}</Text>
              <Text style={[styles.topSpenderAmount, { color: accent.primary }]}>
                {formatCurrency(data.top_spender.paid)}
              </Text>
            </View>
          </CardGlass>
        )}

        <CardGlass style={styles.chartCard}>
          <BarChart
            data={barData}
            width={screenWidth - spacing.lg}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        </CardGlass>

        {/* Member List */}
        <View style={styles.listContainer}>
          {data.members.map((member, index) => (
            <CardGlass key={member.id} style={styles.listItem}>
              <View style={[styles.rankBadge, index === 0 && { backgroundColor: '#FFD700' }]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{member.name}</Text>
                <Text style={styles.listItemSubtext}>{member.count} expenses</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={[styles.listItemAmount, { color: accent.primary }]}>
                  {formatCurrency(member.paid)}
                </Text>
                <Text style={styles.listItemPercent}>{member.percentage.toFixed(1)}%</Text>
              </View>
            </CardGlass>
          ))}
        </View>
      </View>
    );
  };

  // Render Trends section
  const renderTrends = () => {
    if (!data) return <EmptyState message="No trend data available" />;

    const showDaily = currentPeriod === 'week';
    const trendData = showDaily ? data.daily : data.monthly;

    if (!trendData?.length) {
      return <EmptyState message="No trend data available" />;
    }

    const lineData = {
      labels: trendData.map((d) => d.label),
      datasets: [{ data: trendData.map((d) => d.amount || 0) }],
    };

    const hasData = trendData.some((d) => d.amount > 0);

    return (
      <View style={styles.sectionContent}>
        <CardGlass style={styles.chartCard}>
          {hasData ? (
            <LineChart
              data={lineData}
              width={screenWidth - spacing.lg}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              fromZero
            />
          ) : (
            <View style={styles.noDataChart}>
              <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
              <Text style={styles.noDataText}>No spending data for this period</Text>
            </View>
          )}
        </CardGlass>

        {/* Daily/Monthly breakdown */}
        <View style={styles.listContainer}>
          {trendData.map((item, index) => (
            <CardGlass key={index} style={styles.listItem}>
              <Text style={styles.trendLabel}>{item.label}</Text>
              <Text style={[styles.listItemAmount, { color: accent.primary }]}>
                {formatCurrency(item.amount)}
              </Text>
            </CardGlass>
          ))}
        </View>
      </View>
    );
  };

  // Render Personal section
  const renderPersonal = () => {
    if (!data) return null;

    const netBalanceColor = data.net_balance >= 0 ? colors.success : colors.error;
    const netBalanceIcon = data.net_balance >= 0 ? 'arrow-up' : 'arrow-down';

    return (
      <View style={styles.sectionContent}>
        {/* Balance Cards */}
        <View style={styles.statsGrid}>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: accent.primary }]}>
              {formatCurrency(data.your_contribution || 0)}
            </Text>
            <Text style={styles.statLabel}>You Paid</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>
              {formatCurrency(data.your_share || 0)}
            </Text>
            <Text style={styles.statLabel}>Your Share</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <View style={styles.balanceRow}>
              <Ionicons name={netBalanceIcon} size={16} color={netBalanceColor} />
              <Text style={[styles.statValue, { color: netBalanceColor }]}>
                {formatCurrency(Math.abs(data.net_balance || 0))}
              </Text>
            </View>
            <Text style={styles.statLabel}>
              {data.net_balance >= 0 ? 'You get back' : 'You owe'}
            </Text>
          </CardGlass>
        </View>

        {/* You vs Average */}
        {data.you_vs_average && (
          <CardGlass style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>You vs Group Average</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>You</Text>
                <Text style={[styles.compareValue, { color: accent.primary }]}>
                  {formatCurrency(data.you_vs_average.you)}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={24} color={colors.textMuted} />
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>Average</Text>
                <Text style={styles.compareValue}>
                  {formatCurrency(data.you_vs_average.group_avg)}
                </Text>
              </View>
            </View>
          </CardGlass>
        )}

        {/* Your Top Categories */}
        {data.your_top_categories?.length > 0 && (
          <>
            <Text style={styles.sectionSubtitle}>Your Top Categories</Text>
            <View style={styles.listContainer}>
              {data.your_top_categories.map((cat) => (
                <CardGlass key={cat.id} style={styles.listItem}>
                  <Text style={styles.listItemIcon}>{cat.icon}</Text>
                  <Text style={styles.listItemTitle}>{cat.name}</Text>
                  <Text style={[styles.listItemAmount, { color: accent.primary }]}>
                    {formatCurrency(cat.amount)}
                  </Text>
                </CardGlass>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  // Render Settlements section
  const renderSettlements = () => {
    if (!data) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Settlement Stats */}
        <View style={styles.statsGrid}>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(data.total_settled || 0)}
            </Text>
            <Text style={styles.statLabel}>Settled</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {data.pending_count || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </CardGlass>
          <CardGlass style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(data.pending_amount || 0)}
            </Text>
            <Text style={styles.statLabel}>Pending Amt</Text>
          </CardGlass>
        </View>

        {/* Simplified Debts */}
        {data.simplified_debts?.length > 0 && (
          <>
            <Text style={styles.sectionSubtitle}>Who Owes Who</Text>
            <View style={styles.listContainer}>
              {data.simplified_debts.map((debt, index) => (
                <CardGlass key={index} style={styles.debtCard}>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtName}>{debt.from_name}</Text>
                    <Ionicons name="arrow-forward" size={16} color={accent.primary} />
                    <Text style={styles.debtName}>{debt.to_name}</Text>
                  </View>
                  <Text style={[styles.debtAmount, { color: accent.primary }]}>
                    {formatCurrency(debt.amount)}
                  </Text>
                </CardGlass>
              ))}
            </View>
          </>
        )}

        {(!data.simplified_debts || data.simplified_debts.length === 0) && (
          <CardGlass style={styles.allSettledCard}>
            <View style={styles.allSettledIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={styles.allSettledTitle}>All Settled Up!</Text>
            <Text style={styles.allSettledSubtext}>
              No pending balances in this group
            </Text>
          </CardGlass>
        )}
      </View>
    );
  };

  // Render current section content
  const renderContent = () => {
    if (isLoading && !data) {
      return <Loader />;
    }

    if (error && !data) {
      return (
        <CardGlass style={styles.errorCard}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </CardGlass>
      );
    }

    switch (selectedSection) {
      case 'overview':
        return renderOverview();
      case 'categories':
        return renderCategories();
      case 'members':
        return renderMembers();
      case 'trends':
        return renderTrends();
      case 'personal':
        return renderPersonal();
      case 'settlements':
        return renderSettlements();
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Section Tabs */}
      {renderTabs()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!data}
            onRefresh={onRefresh}
            tintColor={accent.primary}
          />
        }
      >
        {/* Time Filter */}
        {renderTimeFilter()}

        {/* Section Content */}
        {renderContent()}
      </ScrollView>
    </LinearGradient>
  );
};

// Helper components
const EmptyState = ({ message }) => (
  <CardGlass style={styles.emptyCard}>
    <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
    <Text style={styles.emptyText}>{message}</Text>
  </CardGlass>
);

// Helper function for chart colors
const getChartColor = (index, primaryColor) => {
  const colors = [
    primaryColor,
    '#0F4C75',
    '#3282B8',
    '#BBE1FA',
    '#1B262C',
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.xs,
  },
  tabSelected: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  timeFilter: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.glass,
    alignItems: 'center',
  },
  timeFilterSelected: {
    // backgroundColor set dynamically
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timeFilterTextSelected: {
    color: '#fff',
  },
  sectionContent: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoCard: {
    padding: spacing.md,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoCardAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  infoCardSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryIcon: {
    fontSize: 18,
  },
  chartCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
  listContainer: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  listItemIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listItemSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  listItemPercent: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  topSpenderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topSpenderInfo: {
    flex: 1,
  },
  topSpenderLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  topSpenderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topSpenderAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  compareItem: {
    alignItems: 'center',
  },
  compareLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  compareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  debtCard: {
    padding: spacing.md,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  debtName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  allSettledCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  allSettledIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  allSettledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  allSettledSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;
