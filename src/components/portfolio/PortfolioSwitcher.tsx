"use client";

import { usePortfolio } from "@/lib/portfolioContext";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function PortfolioSwitcher() {
  const { portfolios, activePortfolioId, setActivePortfolio, stocks, crypto, metals } = usePortfolio();
  const [open, setOpen] = useState(false);

  const active = portfolios.find((p) => p.id === activePortfolioId);
  const label = active ? active.naam : "Alle portefeuilles";

  function countFor(id: string | null) {
    const s = id ? stocks.filter((x) => x.portfolioId === id) : stocks;
    const c = id ? crypto.filter((x) => x.portfolioId === id) : crypto;
    const m = id ? metals.filter((x) => x.portfolioId === id) : metals;
    return s.length + c.length + m.length;
  }

  if (portfolios.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
      >
        {active ? (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: active.kleur }} />
        ) : (
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-56 overflow-hidden">
            <button
              onClick={() => { setActivePortfolio(null); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 text-left ${!activePortfolioId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <div>Alle portefeuilles</div>
                <div className="text-xs text-slate-400">{countFor(null)} posities</div>
              </div>
            </button>
            <div className="border-t border-slate-100" />
            {portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActivePortfolio(p.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 text-left ${activePortfolioId === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.kleur }} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{p.naam}</div>
                  <div className="text-xs text-slate-400">{p.broker} · {countFor(p.id)} posities</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
