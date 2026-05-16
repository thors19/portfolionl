"use client";

import { useState } from "react";
import { Search, Plus, Trash2, RefreshCw } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";
import { v4 as uuidv4 } from "uuid";

interface CoinResult {
  id: string;
  naam: string;
  symbol: string;
  thumb: string;
}

export default function CryptoSection() {
  const { crypto, addCrypto, removeCrypto, updateCryptoAmount } = usePortfolio();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoinResult[]>([]);
  const [selected, setSelected] = useState<CoinResult | null>(null);
  const [aantalCoins, setAantalCoins] = useState("");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSelected(null);
    try {
      const res = await fetch(`/api/crypto?action=search&q=${encodeURIComponent(query.trim())}`);
      const data = await res.json() as { results?: CoinResult[]; error?: string };
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setSearchError("Geen resultaten gevonden.");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Zoekfout");
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd() {
    if (!selected || !aantalCoins) return;
    const aantal = parseFloat(aantalCoins.replace(",", "."));
    if (isNaN(aantal) || aantal <= 0) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/crypto?action=price&ids=${selected.id}`);
      const data = await res.json() as Record<string, { eur: number }>;
      const price = data[selected.id]?.eur ?? null;

      addCrypto({
        id: uuidv4(),
        portfolioId: "default",
        broker: "Handmatig",
        naam: selected.naam,
        coinGeckoId: selected.id,
        aantalCoins: aantal,
        huidigeKoers: price,
        marktwaarde: price != null ? price * aantal : null,
        aankoopkoers: null,
      });

      setQuery("");
      setResults([]);
      setSelected(null);
      setAantalCoins("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Zoek crypto (bijv. bitcoin, ethereum, solana...)"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Zoeken
          </button>
        </div>

        {searchError && <p className="text-sm text-red-500">{searchError}</p>}

        {results.length > 0 && !selected && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            {results.map((coin) => (
              <button
                key={coin.id}
                onClick={() => { setSelected(coin); setResults([]); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm"
              >
                {coin.thumb && <img src={coin.thumb} alt="" className="w-6 h-6 rounded-full" />}
                <span className="font-medium text-slate-800">{coin.naam}</span>
                <span className="text-slate-400">{coin.symbol}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1 text-sm font-medium text-blue-800">{selected.naam} ({selected.symbol})</div>
            <button onClick={() => setSelected(null)} className="text-blue-400 hover:text-blue-600">✕</button>
          </div>
        )}
      </div>

      {/* Amount + Add */}
      {selected && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={aantalCoins}
              onChange={(e) => setAantalCoins(e.target.value)}
              placeholder="Aantal coins/tokens"
              step="any"
              min="0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !aantalCoins || parseFloat(aantalCoins) <= 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Toevoegen
          </button>
        </div>
      )}

      {/* List */}
      {crypto.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Naam</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Aantal</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Koers (EUR)</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Waarde</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {crypto.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.naam}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={c.aantalCoins}
                      step="any"
                      min="0"
                      onChange={(e) => updateCryptoAmount(c.id, parseFloat(e.target.value) || 0)}
                      className="w-28 text-right px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {c.huidigeKoers != null
                      ? `€ ${c.huidigeKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {c.marktwaarde != null
                      ? `€ ${c.marktwaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeCrypto(c.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {crypto.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nog geen crypto toegevoegd.</p>
      )}
    </div>
  );
}
