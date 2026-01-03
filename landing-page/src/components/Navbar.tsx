"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card !rounded-none border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Hisaab"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold text-text-primary">Hisaab</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#screenshots"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Screenshots
            </Link>
            <Link
              href="/#download"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Download
            </Link>
            <a
              href="/#download"
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.523 2H6.477C5.768 2 5.268 2.164 4.884 2.545 4.5 2.928 4.334 3.426 4.334 4.134V19.866c0 .708.166 1.206.55 1.589.384.381.884.545 1.593.545h11.046c.709 0 1.209-.164 1.593-.545.384-.383.55-.881.55-1.589V4.134c0-.708-.166-1.206-.55-1.589C18.732 2.164 18.232 2 17.523 2zM12 20.5a1 1 0 110-2 1 1 0 010 2zm5-3.5H7V5h10v12z" />
              </svg>
              Get App
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-glass-border">
            <div className="flex flex-col gap-4">
              <Link
                href="/#features"
                className="text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#screenshots"
                className="text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Screenshots
              </Link>
              <Link
                href="/#download"
                className="text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Download
              </Link>
              <a
                href="/#download"
                className="btn-primary inline-flex items-center justify-center gap-2 mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Get App
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
