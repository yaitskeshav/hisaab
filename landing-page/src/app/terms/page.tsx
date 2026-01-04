import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions for using the Hisaab expense splitting app.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Terms of Service
          </h1>
          <p className="text-text-muted mb-8">Last updated: January 2025</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-text-secondary leading-relaxed">
                By downloading, installing, or using the Hisaab mobile
                application (&quot;App&quot;), you agree to be bound by these
                Terms of Service (&quot;Terms&quot;). If you do not agree to
                these Terms, do not use the App. We reserve the right to modify
                these Terms at any time, and your continued use of the App
                constitutes acceptance of any modifications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                2. Description of Service
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Hisaab is an expense splitting application that allows users to:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 mt-4">
                <li>Create and manage expense groups</li>
                <li>Record and split expenses among group members</li>
                <li>Track balances and settlements</li>
                <li>Receive notifications about expense activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                3. User Accounts
              </h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                3.1 Account Creation
              </h3>
              <p className="text-text-secondary leading-relaxed mb-4">
                You must create an account to use certain features of the App.
                You agree to provide accurate, current, and complete information
                during registration and to update such information to keep it
                accurate.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2">
                3.2 Account Security
              </h3>
              <p className="text-text-secondary leading-relaxed">
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. You agree to notify us immediately of any unauthorized
                use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                4. User Conduct
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2">
                <li>Use the App for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the App or servers</li>
                <li>Upload malicious code or content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Create false or misleading expense records</li>
                <li>Use the App to commit fraud</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                5. Expense Data and Accuracy
              </h2>
              <p className="text-text-secondary leading-relaxed">
                You are solely responsible for the accuracy of expense
                information you enter into the App. Hisaab is a tool to help
                track and calculate expense splits, but we do not verify the
                accuracy of user-entered data. The App is not a substitute for
                proper financial record-keeping or professional financial
                advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                6. Intellectual Property
              </h2>
              <p className="text-text-secondary leading-relaxed">
                The App, including its design, features, content, and code, is
                owned by Hisaab and is protected by intellectual property laws.
                You are granted a limited, non-exclusive, non-transferable
                license to use the App for personal, non-commercial purposes in
                accordance with these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                7. User Content
              </h2>
              <p className="text-text-secondary leading-relaxed">
                You retain ownership of the content you create in the App
                (expense descriptions, group names, etc.). By using the App, you
                grant us a limited license to store, process, and display this
                content as necessary to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                8. Third-Party Services
              </h2>
              <p className="text-text-secondary leading-relaxed">
                The App may integrate with third-party services (such as Google
                Sign-In). Your use of these services is subject to their
                respective terms and privacy policies. We are not responsible
                for the practices of third-party service providers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                9. Disclaimer of Warranties
              </h2>
              <p className="text-text-secondary leading-relaxed">
                THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED,
                ERROR-FREE, OR SECURE. YOU USE THE APP AT YOUR OWN RISK.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                10. Limitation of Liability
              </h2>
              <p className="text-text-secondary leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, HISAAB SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
                DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                11. Indemnification
              </h2>
              <p className="text-text-secondary leading-relaxed">
                You agree to indemnify and hold harmless Hisaab and its
                affiliates, officers, and employees from any claims, damages,
                losses, or expenses arising from your use of the App or
                violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                12. Termination
              </h2>
              <p className="text-text-secondary leading-relaxed">
                We may suspend or terminate your access to the App at any time,
                with or without cause, with or without notice. Upon termination,
                your right to use the App will immediately cease. You may also
                delete your account at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                13. Governing Law
              </h2>
              <p className="text-text-secondary leading-relaxed">
                These Terms shall be governed by and construed in accordance
                with the laws of India, without regard to its conflict of law
                provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                14. Dispute Resolution
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Any disputes arising from these Terms or your use of the App
                shall be resolved through good-faith negotiation. If a dispute
                cannot be resolved amicably, it shall be subject to the
                exclusive jurisdiction of the courts in India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                15. Severability
              </h2>
              <p className="text-text-secondary leading-relaxed">
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions will continue in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                16. Contact Information
              </h2>
              <p className="text-text-secondary leading-relaxed">
                If you have any questions about these Terms, please contact us
                at:
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
