"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import DegiroImport from "@/components/DegiroImport";
import CryptoSection from "@/components/CryptoSection";
import MetalsSection from "@/components/MetalsSection";
import { FileText, Bitcoin, Gem, Trash2 } from "lucide-react";

type Tab = "aandelen" | "crypto" | "metalen" | "dividend";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "aandelen", label: "Aandelen & ETFs", icon: <FileText className="w-4 h-4" /> },
  { id: "crypto", label: "Crypto", icon: <Bitcoin className="w-4 h-4" /> },
  { id: "metalen", label: "Edelmetalen", icon: <Gem className="w-4 h-4" /> },
  { id: "dividend", label: "Dividend import", icon: <FileText className="w-4 h-4" /> },
];

export default function BeheerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("aandelen");
  const [confirmClear, setConfirmClear] = useState(false);
  const { clearAll, stocks, crypto, metals } = usePortfolio();

  const totalPositions = stocks.length + crypto.length + metals.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portefeuille beheren</h1>
          <p className="text-slate-500 mt-1">Importeer je DEGIRO CSV of voeg crypto en edelmetalen handmatig toe</p>
        </div>
        {totalPositions > 0 && (
          <div>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Alles wissen
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { clearAll(); setConfirmClear(false); }}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Bevestigen
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {activeTab === "aandelen" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">DEGIRO portefeuille importeren</h2>
              <p className="text-sm text-slate-500">
                Download je portefeuille-export via <strong>DEGIRO → Portefeuille → Exporteer (CSV)</strong>.
                Alle aandelen, ETFs en andere effecten worden automatisch herkend. Live koersen worden opgehaald via Yahoo Finance.
              </p>
            </div>
            <DegiroImport mode="portfolio" />
            {stocks.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                {stocks.length} posities geladen · gebruik &quot;Koersen bijwerken&quot; op het dashboard om live koersen op te halen.
              </div>
            )}
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Crypto toevoegen</h2>
              <p className="text-sm text-slate-500">
                Zoek op naam (bijv. bitcoin, ethereum, solana). De CoinGecko ID wordt automatisch opgezocht en de live koers in EUR wordt opgehaald.
              </p>
            </div>
            <CryptoSection />
          </div>
        )}

        {activeTab === "metalen" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Edelmetalen toevoegen</h2>
              <p className="text-sm text-slate-500">
                Kies goud of zilver en vul de hoeveelheid in gram in. De live prijs wordt automatisch opgehaald via XAU/EUR en XAG/EUR.
              </p>
            </div>
            <MetalsSection />
          </div>
        )}

        {activeTab === "dividend" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Dividendhistorie importeren</h2>
              <p className="text-sm text-slate-500">
                Download je rekeningoverzicht via <strong>DEGIRO → Activiteit → Rekeningoverzicht → Exporteer (CSV)</strong>.
                Dividendbetalingen worden automatisch herkend op basis van de omschrijving.
              </p>
            </div>
            <DegiroImport mode="dividend" />
          </div>
        )}
      </div>
    </div>
  );
}
