"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { TrendingUp, Settings, BarChart2, Calculator, PiggyBank, BookOpen, LogIn } from "lucide-react";

const appNavItems = [
  { href: "/dashboard", label: "Dashboard",  icon: TrendingUp },
  { href: "/beheer",    label: "Beheer",     icon: Settings },
  { href: "/dividend",  label: "Dividend",   icon: BarChart2 },
  { href: "/box3",      label: "Box 3",      icon: Calculator },
  { href: "/simulator", label: "Simulator",  icon: PiggyBank },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isSignedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-blue-600 text-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
            PortfolioNL
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {/* App nav — signed in only */}
            {isLoaded && isSignedIn && appNavItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}

            {/* Blog — always visible */}
            <Link
              href="/blog"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/blog")
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Blog</span>
            </Link>

            {/* Auth buttons */}
            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors ml-1">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Inloggen</span>
                </button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <div className="ml-2">
                <UserButton
                  appearance={{ elements: { avatarBox: "w-8 h-8" } }}
                />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
