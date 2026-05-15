import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PortfolioNL – DEGIRO Portfolio Tracker",
  description: "Portfolio tracker voor Nederlandse DEGIRO beleggers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500 bg-white">
            PortfolioNL – Niet-officieel hulpmiddel voor DEGIRO beleggers · Geen financieel advies
          </footer>
        </Providers>
      </body>
    </html>
  );
}
