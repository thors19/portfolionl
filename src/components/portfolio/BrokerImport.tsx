"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, X, Search, AlertTriangle } from "lucide-react";
import { parseBrokerCSV, inferCategorie } from "@/lib/brokerParser";
import { usePortfolio } from "@/lib/portfolioContext";
import { useAuth } from "@clerk/nextjs";
import { getCachedISIN, setCachedISIN } from "@/lib/isinCache";
import { StockPosition, CryptoPosition, ISINLookupResult, BrokerNaam } from "@/lib/types";
import { isISIN } from "@/lib/exchangeMap";
import { applyStoredAankoopkoersen } from "@/lib/aankoopkoersStore";
import { v4 as uuidv4 } from "uuid";

interface Props {
  portfolioId: string;
  broker: BrokerNaam;
  onDone?: () => void;
}

type Status = "idle" | "parsing" | "resolving" | "fetching" | "done" | "error";

const BROKER_COLORS: Record<string, string> = {
  "DEGIRO": "bg-green-50 text-green-700 border-green-200",
  "Trading 212": "bg-blue-50 text-blue-700 border-blue-200",
  "eToro": "bg-purple-50 text-purple-700 border-purple-200",
  "Saxo Bank": "bg-amber-50 text-amber-700 border-amber-200",
  "Revolut": "bg-teal-50 text-teal-700 border-teal-200",
  "Interactive Brokers": "bg-red-50 text-red-700 border-red-200",
  "Bitvavo": "bg-orange-50 text-orange-700 border-orange-200",
  "Binance": "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function BrokerImport({ portfolioId, broker, onDone }: Props) {
  const { setStocks, addCrypto, updateStock, refreshPrices } = usePortfolio();
  const { userId } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [detectedBroker, setDetectedBroker] = useState<BrokerNaam | null>(null);
  const [progress, setProgress] = useState({ resolved: 0, total: 0, current: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setStatus("error"); setMessage("Alleen CSV-bestanden worden ondersteund."); return;
    }
    setStatus("parsing"); setMessage("CSV wordt gelezen en broker herkend…"); setWarnings([]);

    const text = await file.text();
    const { broker: detected, positions, errors } = parseBrokerCSV(text);
    setDetectedBroker(detected);

    if (errors.length > 0) { setStatus("error"); setMessage(errors[0]); return; }
    if (positions.length === 0) { setStatus("error"); setMessage("Geen posities gevonden in dit bestand."); return; }

    // Splits in crypto vs stocks
    const cryptoPositions = positions.filter((p) => inferCategorie(p) === "crypto");
    const stockPositions  = positions.filter((p) => inferCategorie(p) !== "crypto");

    // Voeg crypto toe
    for (const cp of cryptoPositions) {
      addCrypto({
        id: uuidv4(), portfolioId, broker: detected,
        naam: cp.naam, coinGeckoId: cp.ticker,
        aantalCoins: cp.aantal,
        huidigeKoers: null, marktwaarde: cp.waarde,
        aankoopkoers: cp.aankoopprijs,
      });
    }

    // Maak stock posities
    const rawStocks: StockPosition[] = stockPositions.map((p) => ({
      id: uuidv4(), portfolioId, broker: detected,
      naam: p.naam, ticker: p.ticker, isin: p.isin,
      aantalAandelen: p.aantal, exchange: "", currency: p.valuta,
      huidigeKoers: p.huidigeKoers, huidigeKoersValuta: "EUR",
      marktwaarde: p.waarde, degiroKoers: p.huidigeKoers,
      degiroWaardeEur: p.waarde, tickerBron: "csv",
      assetType: "onbekend", assetCategorie: inferCategorie(p),
      aankoopkoers: p.aankoopprijs, aankoopdatum: null, stoploss: null,
    }));

    // Herstel handmatig ingevoerde aankoopprijzen als CSV ze niet bevat
    const newStocks = applyStoredAankoopkoersen(userId, rawStocks);

    setStocks(newStocks, portfolioId);

    // ISIN lookup voor onbekende tickers
    const isinOnly = newStocks.filter((s) => isISIN(s.ticker));
    if (isinOnly.length > 0) {
      setStatus("resolving");
      const BATCH = 5;
      let resolved = 0;
      for (let i = 0; i < isinOnly.length; i += BATCH) {
        const batch = isinOnly.slice(i, i + BATCH);
        setProgress({ resolved, total: isinOnly.length, current: batch[0].naam });
        const uncached = batch.filter((s) => !getCachedISIN(s.isin));
        const cached   = batch.filter((s) => !!getCachedISIN(s.isin));

        for (const s of cached) {
          const r = getCachedISIN(s.isin)!;
          if (r.stooqTicker) updateStock(s.id, { ticker: r.stooqTicker, tickerBron: r.source });
        }

        if (uncached.length > 0) {
          try {
            const res = await fetch("/api/isin-lookup", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(uncached.map((s) => ({ isin: s.isin, naam: s.naam }))),
            });
            const data: Record<string, ISINLookupResult> = await res.json();
            for (const s of uncached) {
              const r = data[s.isin];
              if (r?.stooqTicker) {
                setCachedISIN(s.isin, r);
                updateStock(s.id, { ticker: r.stooqTicker, tickerBron: r.source, ...(r.assetType ? { assetType: r.assetType } : {}) });
              } else {
                updateStock(s.id, { tickerBron: "onbekend", marktwaarde: s.degiroWaardeEur, warning: `Ticker niet gevonden voor ${s.isin}. DEGIRO koers als fallback.` });
              }
            }
          } catch { /* skip */ }
        }
        resolved += batch.length;
        setProgress({ resolved, total: isinOnly.length, current: "" });
      }
    }

    setStatus("fetching"); setMessage(`${positions.length} posities geladen. Live koersen ophalen…`);
    await refreshPrices();

    const warns = newStocks.filter((s) => s.warning).map((s) => `${s.naam}: ${s.warning}`);
    setWarnings(warns);
    setStatus("done"); setMessage(`${positions.length} posities geïmporteerd vanuit ${detected}.`);
    onDone?.();
  }

  const bClass = BROKER_COLORS[broker] ?? "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="font-medium text-slate-700">{broker} CSV importeren</p>
        <p className="text-xs text-slate-400 mt-1">Slepen of klikken om te uploaden</p>
        {detectedBroker && (
          <span className={`mt-3 inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${bClass}`}>
            Herkend: {detectedBroker}
          </span>
        )}
      </div>

      {/* Status */}
      {status !== "idle" && (
        <div className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
          status === "error" ? "bg-red-50 text-red-700 border border-red-200"
          : status === "done" ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-blue-50 text-blue-700 border border-blue-200"
        }`}>
          {status === "error" ? <X className="w-4 h-4 mt-0.5 shrink-0" />
          : status === "done" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          : status === "resolving" ? <Search className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
          : <span className="w-4 h-4 mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 inline-block" />}
          <div className="flex-1">
            {message}
            {status === "resolving" && progress.total > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{progress.current ? `Opzoeken: ${progress.current}…` : "ISIN-lookup…"}</span>
                  <span>{progress.resolved}/{progress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(progress.resolved / progress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />{warnings.length} waarschuwingen:
          </div>
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 pl-6">• {w}</p>)}
        </div>
      )}
    </div>
  );
}
