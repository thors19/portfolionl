"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  TrendingUp, FileText, BarChart2, Calculator, Bitcoin, Gem,
  ArrowRight, CheckCircle, Shield, Zap, Layers,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Alle brokers ondersteund",
    desc: "DEGIRO, Trading 212, eToro, Saxo, IBKR, Revolut, Bitvavo, Binance en meer. CSV uploaden en klaar.",
    color: "blue",
  },
  {
    icon: TrendingUp,
    title: "Live koersen",
    desc: "Realtime koersen voor aandelen, ETFs en edelmetalen wereldwijd. Automatisch omgezet naar EUR.",
    color: "green",
  },
  {
    icon: BarChart2,
    title: "Dividend tracker",
    desc: "Volg al je dividendinkomsten per maand, per aandeel en per jaar. Inclusief bronbelasting overzicht.",
    color: "purple",
  },
  {
    icon: Calculator,
    title: "Box 3 calculator",
    desc: "Bereken je Nederlandse vermogensbelasting op basis van de actuele forfaitaire percentages (2025).",
    color: "red",
  },
  {
    icon: Gem,
    title: "Edelmetalen & Crypto",
    desc: "Goud, zilver, platina, palladium en koper in grammen. Crypto via CoinGecko. Alles in EUR.",
    color: "amber",
  },
  {
    icon: FileText,
    title: "Meerdere portefeuilles",
    desc: "Maak aparte portefeuilles per broker of strategie. Gecombineerd totaaloverzicht in één dashboard.",
    color: "teal",
  },
];

const BROKERS = [
  "DEGIRO", "Trading 212", "eToro", "Saxo Bank", "IBKR", "Revolut", "Bitvavo", "Binance",
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600", red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600", teal: "bg-teal-50 text-teal-600",
};

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="relative container mx-auto px-4 max-w-5xl py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <Zap className="w-3.5 h-3.5" />
            Volledig gratis · Speciaal voor Nederlandse beleggers
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            De slimste portfolio tracker<br />voor{" "}
            <span className="text-blue-200">Nederlandse beleggers</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Importeer je posities van elke broker, volg live koersen in EUR,
            bereken je Box 3 belasting en houd dividenden, crypto en edelmetalen bij.
          </p>

          {/* Broker badges */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {BROKERS.map((b) => (
              <span key={b} className="bg-white/10 border border-white/20 text-white text-xs px-3 py-1 rounded-full">
                ✓ {b}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-lg shadow-lg">
                <span>Maak gratis account aan</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/30 text-white font-medium rounded-xl hover:bg-white/20 transition-colors text-lg">
                <span>Al een account? Inloggen</span>
              </button>
            </SignInButton>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-blue-200 text-sm">
            {["Geen creditcard", "Data op jouw apparaat", "Volledig Nederlands"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 max-w-6xl py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Alles wat je nodig hebt</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Speciaal gebouwd voor de Nederlandse particuliere belegger. EUR als standaard, Box 3 ingebouwd.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[f.color]}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Werkt met alle brokers */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Werkt met alle brokers</h2>
          <p className="text-slate-500 mb-10">Upload je CSV-export en PortfolioNL herkent automatisch welke broker het is.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BROKERS.map((b) => (
              <div key={b} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                <div className="text-sm font-semibold text-slate-700">{b}</div>
                <div className="text-xs text-green-600 mt-1">✓ Ondersteund</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-6">
            Geen CSV beschikbaar? Voeg posities handmatig toe via de ingebouwde zoekfunctie.
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section className="container mx-auto px-4 max-w-3xl py-16 text-center">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-3">Jouw data blijft op jouw apparaat</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            PortfolioNL slaat al je portfoliodata op in de lokale opslag van je browser.
            Er wordt geen financiële data naar servers gestuurd. Volledig privé.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-3xl font-bold mb-4">Begin vandaag nog gratis</h2>
          <p className="text-blue-100 mb-8">
            PortfolioNL is momenteel gratis beschikbaar voor Nederlandse beleggers.
          </p>
          <SignUpButton mode="modal">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-lg">
              <span>Maak gratis account aan</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </SignUpButton>
          <p className="text-blue-200 text-sm mt-4">
            <span>Geen creditcard · Direct toegang · Altijd gratis</span>
          </p>
        </div>
      </section>
    </div>
  );
}
