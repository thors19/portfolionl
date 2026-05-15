"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Settings, BarChart2, Calculator, PiggyBank, BookOpen } from "lucide-react";

const navItems = [
  { href: "/",         label: "Dashboard",  icon: TrendingUp },
  { href: "/beheer",   label: "Beheer",     icon: Settings },
  { href: "/dividend", label: "Dividend",   icon: BarChart2 },
  { href: "/box3",     label: "Box 3",      icon: Calculator },
  { href: "/simulator",label: "Simulator",  icon: PiggyBank },
  { href: "/blog",     label: "Blog",       icon: BookOpen },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <TrendingUp className="w-5 h-5" />
            PortfolioNL
          </Link>
          <nav className="flex gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
