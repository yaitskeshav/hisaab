import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hisaab.app"),
  title: {
    default: "Hisaab - Split Expenses with Friends & Family",
    template: "%s | Hisaab",
  },
  description:
    "Hisaab makes splitting expenses simple. Track shared costs, settle debts, and manage group finances effortlessly. Free expense splitting app for Android.",
  keywords: [
    "expense splitter",
    "split bills",
    "group expenses",
    "expense tracker",
    "splitwise alternative",
    "money manager",
    "shared expenses",
    "bill splitting app",
    "settle debts",
    "hisaab",
  ],
  authors: [{ name: "Hisaab Team" }],
  creator: "Hisaab",
  publisher: "Hisaab",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hisaab.app",
    siteName: "Hisaab",
    title: "Hisaab - Split Expenses with Friends & Family",
    description:
      "Hisaab makes splitting expenses simple. Track shared costs, settle debts, and manage group finances effortlessly.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hisaab - Expense Splitting App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hisaab - Split Expenses with Friends & Family",
    description:
      "Hisaab makes splitting expenses simple. Track shared costs, settle debts, and manage group finances effortlessly.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} antialiased bg-background text-white`}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
