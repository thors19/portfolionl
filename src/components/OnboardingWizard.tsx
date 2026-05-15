"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FileText, Bitcoin, Gem, Target, ArrowRight, CheckCircle, Upload } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";
import DegiroImport from "./DegiroImport";

const STEPS = [
  {
    id: 1,
    icon: FileText,
    title: "Welkom bij PortfolioNL",
    subtitle: "Importeer je DEGIRO portefeuille",
    color: "blue",
  },
  {
    id: 2,
    icon: Bitcoin,
    title: "Crypto & Edelmetalen",
    subtitle: "Voeg eventueel crypto en metalen toe",
    color: "purple",
  },
  {
    id: 3,
    icon: Target,
    title: "Doelgewichten instellen",
    subtitle: "Hoe wil je je vermogen verdelen?",
    color: "green",
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-green-600",
};

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const { userId } = useAuth();
  const router = useRouter();
  const { doelgewicht, setDoelgewicht } = usePortfolio();
  const [draft, setDraft] = useState(doelgewicht);

  function complete() {
    if (userId) {
      localStorage.setItem(`portfolionl_${userId}_onboarded`, "true");
    }
    setDoelgewicht(draft);
    router.push("/dashboard");
  }

  const currentStep = STEPS[step - 1];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 ${colorMap[currentStep.color]} rounded-xl flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Stap {step} van {STEPS.length}</p>
              <h2 className="text-lg font-bold text-slate-800">{currentStep.title}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-6">{currentStep.subtitle}</p>
        </div>

        {/* Step content */}
        <div className="px-8 pb-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-medium mb-2">Hoe download je de DEGIRO CSV?</p>
                <ol className="space-y-1 text-blue-600 list-decimal list-inside">
                  <li>Log in bij DEGIRO.nl</li>
                  <li>Ga naar <strong>Portefeuille</strong></li>
                  <li>Klik op <strong>Exporteer</strong> (rechtsbovenin)</li>
                  <li>Download het CSV-bestand</li>
                </ol>
              </div>
              <DegiroImport mode="portfolio" />
              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mt-2"
              >
                Overslaan, later importeren
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-4">
                  <Bitcoin className="w-6 h-6 text-purple-600 mb-2" />
                  <p className="font-medium text-slate-700 text-sm">Crypto</p>
                  <p className="text-xs text-slate-400 mt-1">Zoek op naam en vul de hoeveelheid in. Koers wordt automatisch opgehaald via CoinGecko.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <Gem className="w-6 h-6 text-amber-600 mb-2" />
                  <p className="font-medium text-slate-700 text-sm">Edelmetalen</p>
                  <p className="text-xs text-slate-400 mt-1">Vul goud, zilver, platina, palladium of koper in grammen in.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Je kunt dit altijd later toevoegen via <strong>Beheer → Crypto / Edelmetalen</strong>
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Stel in hoe je je vermogen wilt verdelen. PortfolioNL berekent hoeveel je moet herbalanceren.
              </p>
              {(["etf", "aandeel", "crypto", "metalen"] as const).map((key) => {
                const labels = { etf: "ETFs", aandeel: "Aandelen", crypto: "Crypto", metalen: "Edelmetalen" };
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-700 w-24">{labels[key]}</span>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-bold text-blue-600 w-10 text-right">{draft[key]}%</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="text-slate-400">Totaal</span>
                <span className={`font-bold ${
                  Object.values(draft).reduce((a, b) => a + b, 0) === 100
                    ? "text-green-600"
                    : "text-red-500"
                }`}>
                  {Object.values(draft).reduce((a, b) => a + b, 0)}%
                  {Object.values(draft).reduce((a, b) => a + b, 0) === 100 && (
                    <CheckCircle className="w-4 h-4 inline ml-1" />
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm text-slate-400 hover:text-slate-600">
              ← Terug
            </button>
          ) : (
            <div />
          )}
          {step < STEPS.length ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Volgende
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={complete}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Naar dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
