import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import CardGlass from '../../components/common/CardGlass';
import IconButton from '../../components/common/IconButton';
import { useAccentColor } from '../../store/themeStore';

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

const TermsOfServiceScreen = ({ navigation }) => {
  const accent = useAccentColor();

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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardGlass style={styles.card}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

          <Section title="1. Acceptance of Terms">
            <Paragraph>
              By downloading, installing, or using the Hisaab mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. We reserve the right to modify these Terms at any time, and your continued use of the App constitutes acceptance of any modifications.
            </Paragraph>
          </Section>

          <Section title="2. Description of Service">
            <Paragraph>Hisaab is an expense splitting application that allows users to:</Paragraph>
            <BulletList items={[
              'Create and manage expense groups',
              'Record and split expenses among group members',
              'Track balances and settlements',
              'Receive notifications about expense activities',
            ]} />
          </Section>

          <Section title="3. User Accounts">
            <Text style={styles.subTitle}>3.1 Account Creation</Text>
            <Paragraph>
              You must create an account to use certain features of the App. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
            </Paragraph>

            <Text style={[styles.subTitle, { marginTop: spacing.md }]}>3.2 Account Security</Text>
            <Paragraph>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </Paragraph>
          </Section>

          <Section title="4. User Conduct">
            <Paragraph>You agree not to:</Paragraph>
            <BulletList items={[
              'Use the App for any unlawful purpose',
              'Attempt to gain unauthorized access to our systems',
              'Interfere with or disrupt the App or servers',
              'Upload malicious code or content',
              'Harass, abuse, or harm other users',
              'Create false or misleading expense records',
              'Use the App to commit fraud',
              'Violate any applicable laws or regulations',
            ]} />
          </Section>

          <Section title="5. Expense Data and Accuracy">
            <Paragraph>
              You are solely responsible for the accuracy of expense information you enter into the App. Hisaab is a tool to help track and calculate expense splits, but we do not verify the accuracy of user-entered data. The App is not a substitute for proper financial record-keeping or professional financial advice.
            </Paragraph>
          </Section>

          <Section title="6. Intellectual Property">
            <Paragraph>
              The App, including its design, features, content, and code, is owned by Hisaab and is protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes in accordance with these Terms.
            </Paragraph>
          </Section>

          <Section title="7. User Content">
            <Paragraph>
              You retain ownership of the content you create in the App (expense descriptions, group names, etc.). By using the App, you grant us a limited license to store, process, and display this content as necessary to provide our services.
            </Paragraph>
          </Section>

          <Section title="8. Third-Party Services">
            <Paragraph>
              The App may integrate with third-party services (such as Google Sign-In). Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the practices of third-party service providers.
            </Paragraph>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <Paragraph>
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOU USE THE APP AT YOUR OWN RISK.
            </Paragraph>
          </Section>

          <Section title="10. Limitation of Liability">
            <Paragraph>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HISAAB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
            </Paragraph>
          </Section>

          <Section title="11. Indemnification">
            <Paragraph>
              You agree to indemnify and hold harmless Hisaab and its affiliates, officers, and employees from any claims, damages, losses, or expenses arising from your use of the App or violation of these Terms.
            </Paragraph>
          </Section>

          <Section title="12. Termination">
            <Paragraph>
              We may suspend or terminate your access to the App at any time, with or without cause, with or without notice. Upon termination, your right to use the App will immediately cease. You may also delete your account at any time.
            </Paragraph>
          </Section>

          <Section title="13. Governing Law">
            <Paragraph>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </Paragraph>
          </Section>

          <Section title="14. Dispute Resolution">
            <Paragraph>
              Any disputes arising from these Terms or your use of the App shall be resolved through good-faith negotiation. If a dispute cannot be resolved amicably, it shall be subject to the exclusive jurisdiction of the courts in India.
            </Paragraph>
          </Section>

          <Section title="15. Severability">
            <Paragraph>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </Paragraph>
          </Section>

          <Section title="16. Contact Information">
            <Paragraph>
              If you have any questions about these Terms, please contact us at:
            </Paragraph>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Text style={[styles.emailLink, { color: accent.primary }]}>{SUPPORT_EMAIL}</Text>
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

export default TermsOfServiceScreen;
