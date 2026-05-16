"use client";

import { usePortfolio } from "@/lib/portfolioContext";
import BrokerImport from "@/components/portfolio/BrokerImport";
import { useState } from "react";
import { RefreshCw, Trash2, Upload, CheckCircle } from "lucide-react";
import Link from "next/link";

const BROKER_KLEUREN: Record<string, string> = {
  "DEGIRO": "#00b140", "Trading 212": "#0043c5", "eToro": "#00cc99",
  "Saxo Bank": "#003366", "Flatex": "#e30613", "Revolut": "#0075eb",
  "Interactive Brokers": "#cc0000", "Bitvavo": "#1a56db", "Binance": "#f0b90b",
  "Handmatig": "#64748b", "Overig": "#94a3b8",
};

export default function BrokersPage() {
  const { portfolios, stocks, crypto, metals, deletePortfolio, clearPortfolio } = usePortfolio();
  const [importPortfolioId, setImportPortfolioId] = useState<string | null>(null);

  function waardeVoor(portfolioId: string): number {
    const s = stocks.filter((x) => x.portfolioId === portfolioId).reduce((a, x) => a + (x.marktwaarde ?? x.degiroWaardeEur ?? 0), 0);
    const c = crypto.filter((x) => x.portfolioId === portfolioId).reduce((a, x) => a + (x.marktwaarde ?? 0), 0);
    const m = metals.filter((x) => x.portfolioId === portfolioId).reduce((a, x) => a + (x.marktwaarde ?? 0), 0);
    return s + c + m;
  }

  function countFor(id: string) {
    return stocks.filter((s) => s.portfolioId === id).length
      + crypto.filter((c) => c.portfolioId === id).length
      + metals.filter((m) => m.portfolioId === id).length;
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brokers & portefeuilles</h1>
          <p className="text-slate-500 mt-1">Overzicht van al je geïmporteerde portefeuilles</p>
        </div>
        <Link href="/beheer"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Beheer
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 mb-4">Nog geen portefeuilles aangemaakt.</p>
          <Link href="/beheer" className="text-blue-600 text-sm hover:underline">Ga naar Beheer →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((p) => {
            const waarde = waardeVoor(p.id);
            const count  = countFor(p.id);
            const kleur  = BROKER_KLEUREN[p.broker] ?? p.kleur;

            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: kleur }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-slate-800">{p.naam}</h2>
                      <span className="text-xs text-slate-400">{p.broker}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setImportPortfolioId(importPortfolioId === p.id ? null : p.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Importeren">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`Alle posities in "${p.naam}" wissen?`)) clearPortfolio(p.id); }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Posities wissen">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {portfolios.length > 1 && (
                        <button onClick={() => { if (confirm(`"${p.naam}" verwijderen incl. alle posities?`)) deletePortfolio(p.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Totale waarde</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {waarde > 0 ? `€ ${waarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Posities</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{count}</p>
                    </div>
                  </div>

                  {p.laatsteImport && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Geïmporteerd: {new Date(p.laatsteImport).toLocaleDateString("nl-NL")}
                    </p>
                  )}

                  {importPortfolioId === p.id && (
                    <div className="border-t border-slate-100 pt-4">
                      <BrokerImport portfolioId={p.id} broker={p.broker} onDone={() => setImportPortfolioId(null)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
