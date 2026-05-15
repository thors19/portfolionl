"use client";

import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  TrendingUp, FileText, BarChart2, Calculator, Bitcoin, Gem,
  ArrowRight, CheckCircle, Shield, Zap,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "DEGIRO CSV Import",
    desc: "Upload je portefeuille-export en alle posities worden automatisch ingeladen. ISIN→ticker lookup via OpenFIGI.",
    color: "blue",
  },
  {
    icon: TrendingUp,
    title: "Live koersen",
    desc: "Realtime koersen via Stooq.com voor aandelen en ETFs wereldwijd. Geen API key nodig.",
    color: "green",
  },
  {
    icon: BarChart2,
    title: "Dividend tracker",
    desc: "Importeer je DEGIRO rekeningoverzicht en volg al je dividendinkomsten per maand.",
    color: "purple",
  },
  {
    icon: Calculator,
    title: "Box 3 calculator",
    desc: "Bereken je jaarlijkse vermogensbelasting op basis van de actuele forfaitaire percentages (2025).",
    color: "red",
  },
  {
    icon: Gem,
    title: "Edelmetalen & Crypto",
    desc: "Voeg goud, zilver, platina, palladium en koper toe in grammen. Crypto via CoinGecko.",
    color: "amber",
  },
  {
    icon: TrendingUp,
    title: "Inleg simulator",
    desc: "Simuleer de groei van je portefeuille met maandelijkse inleg en verwacht rendement.",
    color: "teal",
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600", red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600", teal: "bg-teal-50 text-teal-600",
};

export default function LandingPage() {
  const router = useRouter();
  void router;

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
            Volledig gratis · Geen creditcard nodig
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Gratis portfolio tracker<br />voor Nederlandse{" "}
            <span className="text-blue-200">DEGIRO</span> beleggers
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            Importeer je DEGIRO CSV, volg live koersen, bereken je Box 3 belasting en
            houd dividenden, crypto en edelmetalen bij — alles in één overzicht.
          </p>
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
            {["Geen creditcard", "Data op jouw apparaat", "Geen limieten"].map((item) => (
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
            Alle tools voor de Nederlandse particuliere belegger, gratis en zonder verborgen kosten.
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

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Hoe het werkt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Account aanmaken", desc: "Gratis registreren met e-mail. Geen creditcard vereist." },
              { step: "2", title: "CSV importeren", desc: "Download je portefeuille-export bij DEGIRO en upload die hier." },
              { step: "3", title: "Live volgen", desc: "Koersen worden automatisch opgehaald. Dashboard is direct klaar." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="container mx-auto px-4 max-w-3xl py-16 text-center">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-3">Jouw data blijft op jouw apparaat</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            PortfolioNL slaat al je portfoliodata op in de lokale opslag van je browser.
            Er wordt geen financiële data naar onze servers gestuurd. Alleen je accountgegevens
            worden veilig opgeslagen via Clerk.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-3xl font-bold mb-4">Begin vandaag nog gratis</h2>
          <p className="text-blue-100 mb-8">
            PortfolioNL is momenteel gratis beschikbaar voor een testgroep van Nederlandse beleggers.
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
