import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Hisaab collects, uses, and protects your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-text-muted mb-8">Last updated: January 2025</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                1. Introduction
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Welcome to Hisaab (&quot;we,&quot; &quot;our,&quot; or
                &quot;us&quot;). We are committed to protecting your privacy and
                ensuring the security of your personal information. This Privacy
                Policy explains how we collect, use, disclose, and safeguard
                your information when you use our mobile application and
                services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                2. Information We Collect
              </h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc list-inside text-text-secondary space-y-2 mb-4">
                <li>
                  <strong>Account Information:</strong> Name, email address, and
                  password when you create an account
                </li>
                <li>
                  <strong>Profile Information:</strong> Optional profile picture
                  and display name
                </li>
                <li>
                  <strong>Expense Data:</strong> Details of expenses you create,
                  including amounts, descriptions, categories, and dates
                </li>
                <li>
                  <strong>Group Information:</strong> Group names, members, and
                  related expense data
                </li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc list-inside text-text-secondary space-y-2">
                <li>Device information (type, operating system, unique device identifiers)</li>
                <li>Usage data (features used, time spent in app)</li>
                <li>Push notification tokens for sending notifications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2">
                <li>To provide and maintain our service</li>
                <li>To calculate expense splits and balances</li>
                <li>To send push notifications about expense updates and settlements</li>
                <li>To improve and personalize your experience</li>
                <li>To communicate with you about updates and support</li>
                <li>To detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                4. Data Sharing and Disclosure
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                We do not sell your personal information. We may share your
                information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2">
                <li>
                  <strong>With Group Members:</strong> Expense information is
                  shared with other members of your groups
                </li>
                <li>
                  <strong>Service Providers:</strong> Third-party services that
                  help us operate our app (hosting, analytics)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or
                  to protect our rights
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                5. Data Security
              </h2>
              <p className="text-text-secondary leading-relaxed">
                We implement appropriate technical and organizational security
                measures to protect your personal information against
                unauthorized access, alteration, disclosure, or destruction.
                This includes encryption of data in transit and at rest, secure
                authentication mechanisms, and regular security assessments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                6. Data Retention
              </h2>
              <p className="text-text-secondary leading-relaxed">
                We retain your personal information for as long as your account
                is active or as needed to provide you services. You can request
                deletion of your account and associated data at any time by
                contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                7. Your Rights
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                You have the following rights regarding your personal
                information:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2">
                <li>Access and receive a copy of your data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                8. Third-Party Services
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Our app may use third-party services that collect information.
                These include Google Sign-In for authentication and Firebase for
                push notifications. These services have their own privacy
                policies governing the use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                9. Children&apos;s Privacy
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Our service is not intended for children under 13 years of age.
                We do not knowingly collect personal information from children
                under 13. If we discover that we have collected information from
                a child under 13, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-text-secondary leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the &quot;Last updated&quot; date. Your
                continued use of the app after changes constitutes acceptance of
                the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                11. Contact Us
              </h2>
              <p className="text-text-secondary leading-relaxed">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
              </p>
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@digitalhisaab.tech"}`}
                className="text-primary mt-2 hover:underline inline-block"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@digitalhisaab.tech"}
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
