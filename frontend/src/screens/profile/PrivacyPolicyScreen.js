import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@digitalhisaab.tech';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Paragraph = ({ children }) => (
  <Text style={styles.paragraph}>{children}</Text>
);

const BulletList = ({ items }) => (
  <View style={styles.bulletList}>
    {items.map((item, index) => (
      <View key={index} style={styles.bulletItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          variant="glass"
        />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardGlass style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

          <Section title="1. Introduction">
            <Paragraph>
              Welcome to Hisaab ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
            </Paragraph>
          </Section>

          <Section title="2. Information We Collect">
            <Text style={styles.subTitle}>2.1 Information You Provide</Text>
            <BulletList items={[
              'Account Information: Name, email address, and password when you create an account',
              'Profile Information: Optional profile picture and display name',
              'Expense Data: Details of expenses you create, including amounts, descriptions, categories, and dates',
              'Group Information: Group names, members, and related expense data',
            ]} />

            <Text style={[styles.subTitle, { marginTop: spacing.md }]}>2.2 Automatically Collected Information</Text>
            <BulletList items={[
              'Device information (type, operating system, unique device identifiers)',
              'Usage data (features used, time spent in app)',
              'Push notification tokens for sending notifications',
            ]} />
          </Section>

          <Section title="3. How We Use Your Information">
            <Paragraph>We use the collected information for the following purposes:</Paragraph>
            <BulletList items={[
              'To provide and maintain our service',
              'To calculate expense splits and balances',
              'To send push notifications about expense updates and settlements',
              'To improve and personalize your experience',
              'To communicate with you about updates and support',
              'To detect and prevent fraud or abuse',
            ]} />
          </Section>

          <Section title="4. Data Sharing and Disclosure">
            <Paragraph>We do not sell your personal information. We may share your information in the following circumstances:</Paragraph>
            <BulletList items={[
              'With Group Members: Expense information is shared with other members of your groups',
              'Service Providers: Third-party services that help us operate our app (hosting, analytics)',
              'Legal Requirements: When required by law or to protect our rights',
            ]} />
          </Section>

          <Section title="5. Data Security">
            <Paragraph>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, secure authentication mechanisms, and regular security assessments.
            </Paragraph>
          </Section>

          <Section title="6. Data Retention">
            <Paragraph>
              We retain your personal information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time by contacting us.
            </Paragraph>
          </Section>

          <Section title="7. Your Rights">
            <Paragraph>You have the following rights regarding your personal information:</Paragraph>
            <BulletList items={[
              'Access and receive a copy of your data',
              'Correct inaccurate or incomplete data',
              'Request deletion of your data',
              'Object to or restrict processing of your data',
              'Data portability',
            ]} />
          </Section>

          <Section title="8. Third-Party Services">
            <Paragraph>
              Our app may use third-party services that collect information. These include Google Sign-In for authentication and Firebase for push notifications. These services have their own privacy policies governing the use of your information.
            </Paragraph>
          </Section>

          <Section title="9. Children's Privacy">
            <Paragraph>
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will delete it promptly.
            </Paragraph>
          </Section>

          <Section title="10. Changes to This Policy">
            <Paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the app after changes constitutes acceptance of the updated policy.
            </Paragraph>
          </Section>

          <Section title="11. Contact Us">
            <Paragraph>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </Paragraph>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </Section>
        </CardGlass>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  bulletList: {
    marginTop: spacing.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bullet: {
    fontSize: 15,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  emailLink: {
    fontSize: 15,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});

export default PrivacyPolicyScreen;
