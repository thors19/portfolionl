"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import { useAuth } from "@clerk/nextjs";
import BrokerImport from "@/components/portfolio/BrokerImport";
import ManualPosition from "@/components/portfolio/ManualPosition";
import PortfolioManager from "@/components/portfolio/PortfolioManager";
import CryptoSection from "@/components/CryptoSection";
import MetalsSection from "@/components/MetalsSection";
import DegiroImport from "@/components/DegiroImport";
import OntbrekendeAankoopprijzen from "@/components/portfolio/OntbrekendeAankoopprijzen";
import { FileText, Bitcoin, Gem, Target, Trash2, Upload, PlusCircle, FolderOpen } from "lucide-react";

type Tab = "portefeuilles" | "importeren" | "handmatig" | "crypto" | "metalen" | "dividend";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "portefeuilles", label: "Portefeuilles",  icon: <FolderOpen className="w-4 h-4" /> },
  { id: "importeren",    label: "CSV importeren", icon: <Upload className="w-4 h-4" /> },
  { id: "handmatig",     label: "Handmatig",      icon: <PlusCircle className="w-4 h-4" /> },
  { id: "crypto",        label: "Crypto",         icon: <Bitcoin className="w-4 h-4" /> },
  { id: "metalen",       label: "Edelmetalen",    icon: <Gem className="w-4 h-4" /> },
  { id: "dividend",      label: "Dividend",       icon: <Target className="w-4 h-4" /> },
];

export default function BeheerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("importeren");
  const [confirmClear, setConfirmClear] = useState(false);
  const { portfolios, stocks, crypto, metals, clearAll, activePortfolioId } = usePortfolio();
  const { userId } = useAuth();
  void userId;

  const totalPositions = stocks.length + crypto.length + metals.length;

  // Active portfolio for import
  const importPortfolio = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)
    : portfolios[0];

  return (
    <div className="container mx-auto px-4 max-w-5xl py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portefeuille beheren</h1>
          <p className="text-slate-500 mt-1">Importeer, voeg toe of beheer je posities</p>
        </div>
        {totalPositions > 0 && (
          !confirmClear ? (
            <button onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
              <Trash2 className="w-4 h-4" />Alles wissen
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { clearAll(); setConfirmClear(false); }}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Bevestigen</button>
              <button onClick={() => setConfirmClear(false)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuleren</button>
            </div>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {activeTab === "portefeuilles" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Portefeuilles beheren</h2>
              <p className="text-sm text-slate-500">Maak meerdere portefeuilles aan voor verschillende brokers of strategieën.</p>
            </div>
            <PortfolioManager />
          </div>
        )}

        {activeTab === "importeren" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">CSV importeren</h2>
              <p className="text-sm text-slate-500">
                Ondersteunde brokers: <strong>DEGIRO, Trading 212, eToro, Saxo Bank, Flatex, Revolut, Interactive Brokers, Bitvavo, Binance</strong>.
                De broker wordt automatisch herkend op basis van de kolomnamen.
              </p>
            </div>

            {/* Portfolio selector */}
            {portfolios.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Importeren naar portefeuille</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.naam} ({p.broker})</option>
                  ))}
                </select>
              </div>
            )}

            <BrokerImport
              portfolioId={importPortfolio?.id ?? portfolios[0]?.id ?? "default"}
              broker={importPortfolio?.broker ?? "DEGIRO"}
            />

            {/* Dividend import */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Dividendhistorie importeren (DEGIRO rekeningoverzicht)
              </h3>
              <DegiroImport mode="dividend" />
            </div>
          </div>
        )}

        {activeTab === "handmatig" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Positie handmatig toevoegen</h2>
              <p className="text-sm text-slate-500">
                Zoek op ticker of naam. Ondersteunt aandelen, ETFs, REITs, obligaties, grondstoffen en meer.
              </p>
            </div>
            <ManualPosition portfolioId={importPortfolio?.id} broker={importPortfolio?.broker} />
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Crypto toevoegen</h2>
              <p className="text-sm text-slate-500">
                Zoek op naam via CoinGecko. Live EUR prijs wordt automatisch opgehaald.
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
                Goud, zilver, platina, palladium en koper in grammen. Prijs via XAU/EUR, XAG/EUR etc.
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
                Download je rekeningoverzicht via <strong>DEGIRO → Activiteit → Rekeningoverzicht → Exporteer</strong>.
              </p>
            </div>
            <DegiroImport mode="dividend" />
          </div>
        )}
      </div>

      {/* Ontbrekende aankoopprijzen — altijd zichtbaar als er posities zijn */}
      <OntbrekendeAankoopprijzen />
    </div>
  );
}
