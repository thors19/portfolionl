"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";
import { BrokerNaam } from "@/lib/types";

const BROKERS: BrokerNaam[] = [
  "DEGIRO", "Trading 212", "eToro", "Saxo Bank", "Flatex",
  "Revolut", "Interactive Brokers", "Bitvavo", "Binance", "Handmatig", "Overig",
];

const KLEUREN = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4338ca",
];

export default function PortfolioManager() {
  const { portfolios, addPortfolio, updatePortfolio, deletePortfolio, stocks, crypto, metals } = usePortfolio();
  const [showNew, setShowNew] = useState(false);
  const [newNaam, setNewNaam] = useState("");
  const [newKleur, setNewKleur] = useState(KLEUREN[0]);
  const [newBroker, setNewBroker] = useState<BrokerNaam>("DEGIRO");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState("");

  function handleAdd() {
    if (!newNaam.trim()) return;
    addPortfolio(newNaam.trim(), newKleur, newBroker);
    setNewNaam(""); setNewKleur(KLEUREN[0]); setNewBroker("DEGIRO"); setShowNew(false);
  }

  function countPositions(id: string) {
    return stocks.filter((s) => s.portfolioId === id).length
      + crypto.filter((c) => c.portfolioId === id).length
      + metals.filter((m) => m.portfolioId === id).length;
  }

  return (
    <div className="space-y-3">
      {portfolios.map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: p.kleur }} />
          {editId === p.id ? (
            <input autoFocus value={editNaam} onChange={(e) => setEditNaam(e.target.value)}
              className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") { updatePortfolio(p.id, { naam: editNaam }); setEditId(null); } }} />
          ) : (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{p.naam}</p>
              <p className="text-xs text-slate-400">{p.broker} · {countPositions(p.id)} posities</p>
            </div>
          )}
          <div className="flex gap-1">
            {editId === p.id ? (
              <>
                <button onClick={() => { updatePortfolio(p.id, { naam: editNaam }); setEditId(null); }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditId(p.id); setEditNaam(p.naam); }}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                {portfolios.length > 1 && (
                  <button onClick={() => { if (confirm(`"${p.naam}" en alle posities verwijderen?`)) deletePortfolio(p.id); }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {showNew ? (
        <div className="p-4 bg-white border border-blue-200 rounded-xl space-y-3">
          <input autoFocus value={newNaam} onChange={(e) => setNewNaam(e.target.value)}
            placeholder="Naam portefeuille"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">Broker:</span>
            <select value={newBroker} onChange={(e) => setNewBroker(e.target.value as BrokerNaam)}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
              {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">Kleur:</span>
            {KLEUREN.map((k) => (
              <button key={k} onClick={() => setNewKleur(k)}
                className={`w-5 h-5 rounded-full transition-transform ${newKleur === k ? "scale-125 ring-2 ring-offset-1 ring-blue-600" : ""}`}
                style={{ backgroundColor: k }} />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Annuleren</button>
            <button onClick={handleAdd} disabled={!newNaam.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Aanmaken</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 w-full px-3 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Plus className="w-4 h-4" />Nieuwe portefeuille
        </button>
      )}
    </div>
  );
}
