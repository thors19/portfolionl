"use client";

import { usePortfolio } from "@/lib/portfolioContext";
import { getWinnaarsVerliezers, fPct, fEurTeken } from "@/lib/rendement";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function WinnaarVerliezer() {
  const { activeStocks, activeCrypto } = usePortfolio();
  const { winnaars, verliezers } = getWinnaarsVerliezers(activeStocks, activeCrypto);

  if (winnaars.length === 0 && verliezers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Winnaars */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-green-50">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-800">Beste performers</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {winnaars.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Geen data met aankoopkoers</p>
          ) : winnaars.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800 truncate max-w-32">{p.naam}</p>
                <p className="text-xs text-slate-400">{p.ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">{fPct(p.rendementPct)}</p>
                <p className="text-xs text-green-500">{fEurTeken(p.rendementEUR)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verliezers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-red-50">
          <TrendingDown className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-800">Slechtste performers</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {verliezers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Geen data met aankoopkoers</p>
          ) : verliezers.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800 truncate max-w-32">{p.naam}</p>
                <p className="text-xs text-slate-400">{p.ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600">{fPct(p.rendementPct)}</p>
                <p className="text-xs text-red-500">{fEurTeken(p.rendementEUR)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
