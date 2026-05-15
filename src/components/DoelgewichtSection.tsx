"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolioContext";

interface CategoryRow {
  label: string;
  key: keyof import("@/lib/types").DoelgewichtSettings;
  huidigeWaarde: number;
  color: string;
}

export default function DoelgewichtSection() {
  const { stocks, crypto, metals, doelgewicht, setDoelgewicht } = usePortfolio();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doelgewicht);

  const totaalStocks = stocks.reduce((s, p) => s + (p.marktwaarde ?? p.degiroWaardeEur ?? 0), 0);
  const totaalEtfs = stocks.filter((p) => p.assetType === "etf").reduce((s, p) => s + (p.marktwaarde ?? p.degiroWaardeEur ?? 0), 0);
  const totaalAandelen = stocks.filter((p) => p.assetType === "aandeel" || p.assetType === "onbekend").reduce((s, p) => s + (p.marktwaarde ?? p.degiroWaardeEur ?? 0), 0);
  const totaalCrypto = crypto.reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const totaalMetalen = metals.reduce((s, m) => s + (m.marktwaarde ?? 0), 0);
  const totaal = totaalEtfs + totaalAandelen + totaalCrypto + totaalMetalen;

  const rows: CategoryRow[] = [
    { label: "ETFs", key: "etf", huidigeWaarde: totaalEtfs, color: "blue" },
    { label: "Aandelen", key: "aandeel", huidigeWaarde: totaalAandelen, color: "green" },
    { label: "Crypto", key: "crypto", huidigeWaarde: totaalCrypto, color: "purple" },
    { label: "Edelmetalen", key: "metalen", huidigeWaarde: totaalMetalen, color: "amber" },
  ];
  void totaalStocks;

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const barColorMap: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500", amber: "bg-amber-500",
  };

  function saveDraft() {
    setDoelgewicht(draft);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Doelgewicht & herbalancering</h2>
          <p className="text-xs text-slate-400 mt-0.5">Stel je gewenste verdeling in en zie hoeveel je moet herbalanceren</p>
        </div>
        {!editing ? (
          <button onClick={() => { setDraft(doelgewicht); setEditing(true); }}
            className="text-sm text-blue-600 hover:underline">Aanpassen</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={saveDraft} className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Opslaan</button>
            <button onClick={() => setEditing(false)} className="text-sm px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Annuleren</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const huidigPct = totaal > 0 ? (row.huidigeWaarde / totaal) * 100 : 0;
          const doelPct = draft[row.key];
          const verschilPct = huidigPct - doelPct;
          const verschilEur = totaal > 0 ? (verschilPct / 100) * totaal : 0;
          const over = verschilEur > 0;

          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colorMap[row.color]}`}>
                    {row.label}
                  </span>
                  <span className="text-sm text-slate-600">
                    € {row.huidigeWaarde.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100} step={5}
                        value={draft[row.key]}
                        onChange={(e) => setDraft({ ...draft, [row.key]: Number(e.target.value) })}
                        className="w-16 text-right px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-slate-700">
                      {huidigPct.toFixed(1)}% / {doelPct}%
                    </span>
                  )}
                  {!editing && Math.abs(verschilEur) > 10 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${over ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {over ? "Verkopen" : "Bijkopen"} € {Math.abs(verschilEur).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`absolute h-full rounded-full ${barColorMap[row.color]} opacity-30`}
                  style={{ width: `${Math.min(doelPct, 100)}%` }} />
                <div className={`absolute h-full rounded-full ${barColorMap[row.color]}`}
                  style={{ width: `${Math.min(huidigPct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {!editing && totaal === 0 && (
        <p className="text-sm text-slate-400 text-center mt-4">Importeer posities om de herbalancering te berekenen.</p>
      )}
    </div>
  );
}
