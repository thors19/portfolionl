"use client";

import { useState } from "react";
import { Search, Plus, RefreshCw } from "lucide-react";
import { usePortfolio, DEFAULT_PORTFOLIO_ID } from "@/lib/portfolioContext";
import { StockPosition, BrokerNaam, AssetCategorie } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface StooqSuggestie { ticker: string; naam: string; }

const CATEGORIEEN: { waarde: AssetCategorie; label: string }[] = [
  { waarde: "aandeel",  label: "Aandeel" },
  { waarde: "etf",      label: "ETF" },
  { waarde: "reit",     label: "REIT / Vastgoed" },
  { waarde: "obligatie",label: "Obligatie" },
  { waarde: "grondstof",label: "Grondstof" },
  { waarde: "spaar",    label: "Spaargeld / Deposito" },
  { waarde: "onbekend", label: "Overig" },
];

interface Props {
  portfolioId?: string;
  broker?: BrokerNaam;
}

export default function ManualPosition({ portfolioId = DEFAULT_PORTFOLIO_ID, broker = "Handmatig" }: Props) {
  const { setStocks, stocks, updateStock, refreshPrices, portfolios } = usePortfolio();

  const [zoek, setZoek] = useState("");
  const [suggesties, setSuggesties] = useState<StooqSuggestie[]>([]);
  const [geselecteerd, setGeselecteerd] = useState<StooqSuggestie | null>(null);
  const [categorie, setCategorie] = useState<AssetCategorie>("aandeel");
  const [aantal, setAantal] = useState("");
  const [aankoopprijs, setAankoopprijs] = useState("");
  const [datum, setDatum] = useState("");
  const [valuta, setValuta] = useState("EUR");
  const [zoekend, setZoekend] = useState(false);
  const [toevoegend, setToevoegend] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(portfolioId);
  const [toegevoegd, setToegevoegd] = useState(false);

  async function handleZoek() {
    if (!zoek.trim()) return;
    setZoekend(true); setSuggesties([]); setGeselecteerd(null);
    try {
      // Try Stooq first: fetch price to verify ticker exists
      const ticker = zoek.trim().toLowerCase().replace(/\s+/g, "");
      const res = await fetch(`/api/quotes?tickers=${ticker}:EUR`);
      const data = await res.json() as Record<string, { priceEur: number; error?: string }>;
      if (!data[ticker]?.error) {
        setSuggesties([{ ticker, naam: zoek.trim() }]);
      } else {
        // Try with common exchange suffixes
        const varianten = [`${ticker}.nl`, `${ticker}.us`, `${ticker}.de`, `${ticker}.uk`];
        const varRes = await fetch(`/api/quotes?tickers=${varianten.map((t) => `${t}:EUR`).join(",")}`);
        const varData = await varRes.json() as Record<string, { priceEur: number; error?: string }>;
        const gevonden = varianten.filter((t) => !varData[t]?.error);
        setSuggesties(gevonden.map((t) => ({ ticker: t, naam: zoek.trim() })));
        if (gevonden.length === 0) setSuggesties([{ ticker, naam: zoek.trim() }]); // handmatig toestaan
      }
    } finally {
      setZoekend(false);
    }
  }

  async function handleToevoegen() {
    if (!geselecteerd || !aantal) return;
    setToevoegend(true);
    try {
      const positie: StockPosition = {
        id: uuidv4(),
        portfolioId: selectedPortfolioId,
        broker,
        naam: geselecteerd.naam,
        ticker: geselecteerd.ticker,
        isin: "",
        aantalAandelen: parseFloat(aantal.replace(",", ".")),
        exchange: "",
        currency: valuta,
        huidigeKoers: null,
        huidigeKoersValuta: "EUR",
        marktwaarde: null,
        degiroKoers: aankoopprijs ? parseFloat(aankoopprijs.replace(",", ".")) : null,
        degiroWaardeEur: null,
        tickerBron: "csv",
        assetType: categorie === "etf" ? "etf" : "aandeel",
        assetCategorie: categorie,
        aankoopkoers: aankoopprijs ? parseFloat(aankoopprijs.replace(",", ".")) : null,
        aankoopdatum: datum || null,
        stoploss: null,
      };

      setStocks([...stocks, positie]);

      // Haal live koers op
      const res = await fetch(`/api/quotes?tickers=${geselecteerd.ticker}:${valuta}`);
      const data = await res.json() as Record<string, { priceEur: number; error?: string }>;
      const entry = data[geselecteerd.ticker];
      if (entry && !entry.error) {
        updateStock(positie.id, {
          huidigeKoers: entry.priceEur,
          marktwaarde: entry.priceEur * positie.aantalAandelen,
        });
      }

      await refreshPrices();

      // Reset
      setZoek(""); setSuggesties([]); setGeselecteerd(null);
      setAantal(""); setAankoopprijs(""); setDatum("");
      setToegevoegd(true); setTimeout(() => setToegevoegd(false), 3000);
    } finally {
      setToevoegend(false);
    }
  }

  return (
    <div className="space-y-4">
      {toegevoegd && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          ✓ Positie toegevoegd aan je portefeuille.
        </div>
      )}

      {/* Zoekbalk */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Zoek op ticker of naam</label>
        <div className="flex gap-2">
          <input type="text" value={zoek} onChange={(e) => setZoek(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleZoek()}
            placeholder="bijv. ASML, VWRL, aapl.us"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={handleZoek} disabled={zoekend || !zoek.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {zoekend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Zoeken
          </button>
        </div>

        {suggesties.length > 0 && !geselecteerd && (
          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
            {suggesties.map((s) => (
              <button key={s.ticker} onClick={() => setGeselecteerd(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm border-b border-slate-100 last:border-0">
                <span className="font-mono text-blue-600 text-xs bg-blue-50 px-1.5 py-0.5 rounded">{s.ticker}</span>
                <span className="text-slate-700">{s.naam}</span>
              </button>
            ))}
          </div>
        )}

        {geselecteerd && (
          <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="font-mono text-xs text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">{geselecteerd.ticker}</span>
            <span className="text-sm text-blue-800 font-medium flex-1">{geselecteerd.naam}</span>
            <button onClick={() => { setGeselecteerd(null); setSuggesties([]); }} className="text-blue-400 hover:text-blue-600">✕</button>
          </div>
        )}
      </div>

      {/* Details */}
      {geselecteerd && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value as AssetCategorie)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CATEGORIEEN.map((c) => <option key={c.waarde} value={c.waarde}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Valuta</label>
            <select value={valuta} onChange={(e) => setValuta(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Aantal *</label>
            <input type="number" value={aantal} onChange={(e) => setAantal(e.target.value)}
              placeholder="0" min="0" step="any"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Aankoopkoers</label>
            <input type="number" value={aankoopprijs} onChange={(e) => setAankoopprijs(e.target.value)}
              placeholder="optioneel" min="0" step="any"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Aankoopdatum</label>
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Portefeuille</label>
            <select value={selectedPortfolioId} onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {portfolios.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
            </select>
          </div>
        </div>
      )}

      {geselecteerd && (
        <button onClick={handleToevoegen} disabled={toevoegend || !aantal}
          className="flex items-center gap-2 w-full justify-center px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {toevoegend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Toevoegen aan portefeuille
        </button>
      )}
    </div>
  );
}
