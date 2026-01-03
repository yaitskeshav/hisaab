import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-glass-border bg-background-dark/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Hisaab"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-text-primary">
                Hisaab
              </span>
            </Link>
            <p className="text-text-secondary max-w-sm">
              The simplest way to split expenses with friends, roommates, and
              family. Track shared costs and settle up with ease.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-text-primary font-semibold mb-4">App</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#features"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#screenshots"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Screenshots
                </Link>
              </li>
              <li>
                <Link
                  href="/#download"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Download
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-text-primary font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-glass-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-sm">
            &copy; {currentYear} Hisaab. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm">Made with</span>
            <span className="text-red-500">&#10084;</span>
            <span className="text-text-muted text-sm">for simple finances</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
