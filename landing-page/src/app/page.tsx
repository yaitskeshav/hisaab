import Image from "next/image";

const features = [
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: "Group Expenses",
    description:
      "Create groups for trips, roommates, or any shared activity. Add members and track expenses together.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    title: "Smart Splitting",
    description:
      "Split bills equally or customize amounts for each person. Hisaab calculates who owes what automatically.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Easy Settlements",
    description:
      "See exactly who owes whom at a glance. Settle debts with a single tap and keep everyone in sync.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
    title: "Categories",
    description:
      "Organize expenses with built-in categories or create your own. Know exactly where your money goes.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    title: "Notifications",
    description:
      "Stay updated with push notifications for new expenses, settlements, and group activities.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: "Secure & Private",
    description:
      "Your data is encrypted and secure. We never share your financial information with third parties.",
  },
];

const screenshots = [
  { src: "/screenshots/home.png", alt: "Home Screen", label: "Dashboard" },
  { src: "/screenshots/group.png", alt: "Group Details", label: "Group View" },
  { src: "/screenshots/expense.png", alt: "Add Expense", label: "Add Expense" },
  { src: "/screenshots/settle.png", alt: "Settle Up", label: "Settlements" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 glass-card mb-6">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="text-text-secondary text-sm">
                  Now available for Android
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Split expenses
                <br />
                <span className="gradient-text">the simple way</span>
              </h1>

              <p className="text-xl text-text-secondary mb-8 max-w-lg mx-auto lg:mx-0">
                Stop the awkward &quot;who owes what&quot; conversations. Hisaab
                makes splitting bills with friends, roommates, and family
                effortless.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href={process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/hisaab.apk"}
                  download
                  className="btn-primary inline-flex items-center justify-center gap-2 text-lg"
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 3.68l5.7 6.62 5.71-6.62H3zm14.58 0l-5.71 6.62h11.42L17.58 3.68zM6.29 11.55l-2.58 8.76 5.7-6.62-3.12-2.14zm14.58 2.14l-3.12 2.14 5.7 6.62-2.58-8.76zM12 13.83L6.29 11.55 12 21l5.71-9.45L12 13.83z" />
                  </svg>
                  Download APK
                </a>
                <a
                  href="#features"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-lg"
                >
                  Learn More
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </a>
              </div>

              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    Free
                  </div>
                  <div className="text-sm text-text-muted">Forever</div>
                </div>
                <div className="w-px h-12 bg-glass-border"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    No Ads
                  </div>
                  <div className="text-sm text-text-muted">Clean UI</div>
                </div>
                <div className="w-px h-12 bg-glass-border"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    Open
                  </div>
                  <div className="text-sm text-text-muted">Source</div>
                </div>
              </div>
            </div>

            {/* Right content - Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="phone-mockup floating glow w-[280px] sm:w-[320px]">
                <div className="phone-screen aspect-[9/19.5] relative">
                  <Image
                    src="/screenshots/home.png"
                    alt="Hisaab App Screenshot"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="gradient-text">split expenses</span>
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Designed with simplicity in mind. No complicated features, just
              what you need to manage shared finances.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card feature-card p-6 hover:border-primary/50"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Beautiful & <span className="gradient-text">intuitive</span>{" "}
              design
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              A clean, modern interface that makes managing expenses a pleasure.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="flex flex-col items-center gap-4">
                <div className="phone-mockup w-full max-w-[200px]">
                  <div className="phone-screen aspect-[9/19.5] relative bg-background-light">
                    <Image
                      src={screenshot.src}
                      alt={screenshot.alt}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <span className="text-text-secondary font-medium">
                  {screenshot.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8 sm:p-12 text-center glow">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-6">
              <Image
                src="/logo.png"
                alt="Hisaab"
                width={56}
                height={56}
                className="rounded-xl"
              />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to simplify your{" "}
              <span className="gradient-text">finances</span>?
            </h2>
            <p className="text-xl text-text-secondary mb-8 max-w-lg mx-auto">
              Download Hisaab now and never worry about splitting bills again.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/hisaab.apk"}
                download
                className="btn-primary inline-flex items-center justify-center gap-3 text-lg px-8 py-4"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 2H6.477C5.768 2 5.268 2.164 4.884 2.545 4.5 2.928 4.334 3.426 4.334 4.134V19.866c0 .708.166 1.206.55 1.589.384.381.884.545 1.593.545h11.046c.709 0 1.209-.164 1.593-.545.384-.383.55-.881.55-1.589V4.134c0-.708-.166-1.206-.55-1.589C18.732 2.164 18.232 2 17.523 2zM12 20.5a1 1 0 110-2 1 1 0 010 2zm5-3.5H7V5h10v12z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Download for</div>
                  <div className="font-semibold">Android</div>
                </div>
              </a>

              <div className="btn-secondary inline-flex items-center justify-center gap-3 text-lg px-8 py-4 opacity-60 cursor-not-allowed">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Coming soon</div>
                  <div className="font-semibold">iOS</div>
                </div>
              </div>
            </div>

            <p className="text-text-muted text-sm mt-6">
              Version 1.0.0 &bull; Requires Android 8.0 or higher
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it <span className="gradient-text">works</span>
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create a group",
                description:
                  "Start a group for your trip, apartment, or any shared activity. Invite friends with a simple code.",
              },
              {
                step: "2",
                title: "Add expenses",
                description:
                  "Log expenses as they happen. Split equally or customize how much each person owes.",
              },
              {
                step: "3",
                title: "Settle up",
                description:
                  "See who owes what at a glance. Settle debts directly and keep everyone square.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-text-primary">
                  {item.title}
                </h3>
                <p className="text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
