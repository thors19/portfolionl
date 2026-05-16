"use client";

import { useState, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import { useAuth } from "@clerk/nextjs";
import { Pencil, Check, X, AlertCircle } from "lucide-react";
import { saveAankoopkoers } from "@/lib/aankoopkoersStore";

function InlineEditor({ huidig, onSave, onCancel }: {
  huidig: number | null;
  onSave: (p: number) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(huidig != null ? String(huidig).replace(".", ",") : "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  function commit() {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) onSave(n); else onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
        placeholder="0,00"
        className="w-28 text-right px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onClick={commit} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Opslaan">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Annuleren">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function OntbrekendeAankoopprijzen() {
  const { stocks, updateStock } = usePortfolio();
  const { userId } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const ontbrekend = stocks.filter(
    (s) => (s.aankoopkoers == null || s.aankoopkoers === 0) && !saved.has(s.id)
  );

  if (ontbrekend.length === 0) return null;

  function handleSave(id: string, isin: string, ticker: string, prijs: number) {
    updateStock(id, { aankoopkoers: prijs });
    saveAankoopkoers(userId, isin || ticker, prijs);
    setSaved((prev) => new Set([...prev, id]));
    setEditingId(null);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            {ontbrekend.length} positie{ontbrekend.length !== 1 ? "s" : ""} zonder aankoopprijs
          </h3>
          <p className="text-xs text-amber-600 mt-0.5">
            Vul de gemiddelde aankoopprijs per stuk in om rendement te berekenen.
          </p>
        </div>
      </div>

      <div className="divide-y divide-amber-100">
        {ontbrekend.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/60">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{s.naam}</p>
              <p className="text-xs text-slate-400">{s.ticker} · {s.aantalAandelen} stuks</p>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {editingId === s.id ? (
                <InlineEditor
                  huidig={s.aankoopkoers}
                  onSave={(p) => handleSave(s.id, s.isin, s.ticker, p)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <button
                  onClick={() => setEditingId(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Invoeren
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
