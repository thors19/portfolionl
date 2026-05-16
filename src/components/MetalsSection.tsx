"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";
import { MetaalType, MetalPosition } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Conversion factors: Stooq price unit → EUR per gram
// Troy oz metals: 1 gram = 0.0321507 troy oz  → pricePerGram = pricePerTroyOz × 0.0321507
// Copper: price is per pound → 1 gram = 0.00220462 pounds → pricePerGram = pricePerLb × 0.00220462
const METAL_GRAM_FACTOR: Record<MetaalType, number> = {
  goud:      0.0321507,   // troy oz per gram
  zilver:    0.0321507,
  platina:   0.0321507,
  palladium: 0.0321507,
  koper:     0.00220462,  // pound per gram
};

const METAL_LABELS: Record<MetaalType, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina", palladium: "Palladium", koper: "Koper",
};

// Stooq tickers + their native currency
const METAL_STOOQ: Record<MetaalType, { ticker: string; currency: string }> = {
  goud:      { ticker: "xaueur", currency: "EUR" },
  zilver:    { ticker: "xageur", currency: "EUR" },
  platina:   { ticker: "xptusd", currency: "USD" },
  palladium: { ticker: "xpdusd", currency: "USD" },
  koper:     { ticker: "hgusd",  currency: "USD" },
};

const METAL_TYPES: MetaalType[] = ["goud", "zilver", "platina", "palladium", "koper"];

export default function MetalsSection() {
  const { metals, addMetal, removeMetal, updateMetalAmount } = usePortfolio();
  const [type, setType] = useState<MetaalType>("goud");
  const [grammen, setGrammen] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const g = parseFloat(grammen.replace(",", "."));
    if (isNaN(g) || g <= 0) return;
    setAdding(true);
    try {
      const { ticker, currency } = METAL_STOOQ[type];
      const res = await fetch(`/api/quotes?tickers=${ticker}:${currency}`);
      const data = await res.json() as Record<string, { priceEur: number; error?: string }>;
      const pricePerUnit = data[ticker]?.priceEur ?? null; // EUR per troy oz or EUR per pound
      const pricePerGram = pricePerUnit != null ? pricePerUnit * METAL_GRAM_FACTOR[type] : null;

      addMetal({
        id: uuidv4(),
        portfolioId: "default",
        broker: "Handmatig",
        type,
        grammen: g,
        prijsPerGram: pricePerGram,
        marktwaarde: pricePerGram != null ? pricePerGram * g : null,
      });
      setGrammen("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Metaal</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MetaalType)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {METAL_TYPES.map((t) => (
              <option key={t} value={t}>{METAL_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Hoeveelheid (gram)</label>
          <div className="relative">
            <input
              type="number" value={grammen} onChange={(e) => setGrammen(e.target.value)}
              placeholder="bijv. 100" min="0" step="0.1"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">g</span>
          </div>
        </div>
        <button
          onClick={handleAdd} disabled={adding || !grammen || parseFloat(grammen) <= 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Toevoegen
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Goud & Zilver: XAU/EUR en XAG/EUR (Stooq). Platina & Palladium: XPT/USD en XPD/USD → EUR.
        Koper: HG/USD (per pound) → EUR per gram. 1 troy oz = 31,1 g · 1 lb = 453,6 g.
      </p>

      {metals.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Metaal</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Grammen</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Per gram</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Waarde</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metals.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{METAL_LABELS[m.type]}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number" value={m.grammen} step="0.1" min="0"
                      onChange={(e) => updateMetalAmount(m.id, parseFloat(e.target.value) || 0)}
                      className="w-28 text-right px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {m.prijsPerGram != null
                      ? `€ ${m.prijsPerGram.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {m.marktwaarde != null
                      ? `€ ${m.marktwaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeMetal(m.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {metals.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nog geen edelmetalen toegevoegd.</p>
      )}
    </div>
  );
}
