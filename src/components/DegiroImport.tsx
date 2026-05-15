"use client";

import { useState, useRef } from "react";
import { Upload, AlertTriangle, CheckCircle, X, Search } from "lucide-react";
import { parsePortfolioCSV, parseDividendCSV } from "@/lib/csvParser";
import { usePortfolio } from "@/lib/portfolioContext";
import { getCachedISIN, setCachedISIN } from "@/lib/isinCache";
import { ISINLookupResult } from "@/lib/types";

type Mode = "portfolio" | "dividend";

type StatusType = "idle" | "parsing" | "resolving" | "fetching" | "done" | "error";

interface Progress {
  total: number;
  resolved: number;
  current: string;
}

export default function DegiroImport({ mode }: { mode: Mode }) {
  const { setStocks, setDividends, updateStock, refreshPrices } = usePortfolio();
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setStatus("error");
      setMessage("Alleen CSV-bestanden worden ondersteund.");
      return;
    }

    setStatus("parsing");
    setMessage("CSV wordt gelezen…");
    setWarnings([]);
    setProgress(null);

    try {
      const text = await file.text();

      if (mode === "portfolio") {
        const positions = parsePortfolioCSV(text);
        if (positions.length === 0) {
          setStatus("error");
          setMessage("Geen posities gevonden. Controleer of dit een DEGIRO portefeuille-export is.");
          return;
        }

        // Save immediately so dashboard shows positions right away (with DEGIRO fallback)
        setStocks(positions);

        // Identify ISIN-only positions that need resolution
        const isinOnly = positions.filter((p) => p.tickerBron === "pending" && p.isin);

        if (isinOnly.length > 0) {
          setStatus("resolving");
          setProgress({ total: isinOnly.length, resolved: 0, current: "" });

          // Check cache first (client-side)
          const uncached: typeof isinOnly = [];
          for (const pos of isinOnly) {
            const cached = getCachedISIN(pos.isin);
            if (cached?.stooqTicker) {
              // Apply cached result immediately
              updateStock(pos.id, {
                ticker: cached.stooqTicker,
                tickerBron: cached.source,
                warning: undefined,
              });
            } else {
              uncached.push(pos);
            }
          }

          // Resolve uncached ISINs via API (in batches)
          if (uncached.length > 0) {
            const BATCH = 5;
            let resolved = isinOnly.length - uncached.length; // start with cached count

            for (let i = 0; i < uncached.length; i += BATCH) {
              const batch = uncached.slice(i, i + BATCH);
              setProgress({
                total: isinOnly.length,
                resolved,
                current: batch[0].naam,
              });

              try {
                const res = await fetch("/api/isin-lookup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(batch.map((p) => ({ isin: p.isin, naam: p.naam }))),
                });
                const data: Record<string, ISINLookupResult> = await res.json();

                for (const pos of batch) {
                  const result = data[pos.isin];
                  if (result?.stooqTicker) {
                    setCachedISIN(pos.isin, result);
                    updateStock(pos.id, {
                      ticker: result.stooqTicker,
                      tickerBron: result.source,
                      ...(result.assetType && result.assetType !== "onbekend" ? { assetType: result.assetType } : {}),
                      warning: undefined,
                    });
                  } else {
                    // All steps failed — keep DEGIRO fallback price with warning
                    updateStock(pos.id, {
                      tickerBron: "onbekend",
                      marktwaarde: pos.degiroWaardeEur,
                      warning: `Ticker niet gevonden voor ISIN ${pos.isin}. DEGIRO koers wordt gebruikt als fallback.`,
                    });
                  }
                  resolved++;
                }
              } catch {
                // Network error — mark batch as failed gracefully
                for (const pos of batch) {
                  updateStock(pos.id, {
                    tickerBron: "onbekend",
                    marktwaarde: pos.degiroWaardeEur,
                    warning: `ISIN-lookup mislukt voor ${pos.isin}. DEGIRO koers wordt als fallback gebruikt.`,
                  });
                  resolved++;
                }
              }

              setProgress({ total: isinOnly.length, resolved, current: "" });
            }
          }

          setProgress({ total: isinOnly.length, resolved: isinOnly.length, current: "" });
        }

        // Fetch live prices for all resolved positions
        setStatus("fetching");
        setMessage(`${positions.length} posities geladen. Live koersen worden opgehaald…`);
        await refreshPrices();

        const warns = positions.filter((p) => p.warning).map((p) => `${p.naam}: ${p.warning}`);
        setWarnings(warns);
        setStatus("done");
        setMessage(`${positions.length} posities geïmporteerd.`);
      } else {
        // Dividend CSV
        const records = parseDividendCSV(text);
        if (records.length === 0) {
          setStatus("error");
          setMessage("Geen dividendbetalingen gevonden. Controleer of dit een DEGIRO rekeningoverzicht is.");
          return;
        }
        setDividends(records);
        setStatus("done");
        setMessage(`${records.length} dividendrecords geïmporteerd.`);
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Onbekende fout bij het verwerken van de CSV.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const label = mode === "portfolio" ? "DEGIRO Portefeuille CSV" : "DEGIRO Rekeningoverzicht CSV";
  const hint =
    mode === "portfolio"
      ? "Download via DEGIRO → Portefeuille → Exporteer"
      : "Download via DEGIRO → Activiteit → Rekeningoverzicht → Exporteer";

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="font-medium text-slate-700">{label}</p>
        <p className="text-sm text-slate-400 mt-1">{hint}</p>
        <p className="text-xs text-slate-300 mt-3">Slepen of klikken om te uploaden</p>
      </div>

      {/* Status banner */}
      {status !== "idle" && (
        <div
          className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
            status === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : status === "done"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {status === "error" ? (
            <X className="w-4 h-4 mt-0.5 shrink-0" />
          ) : status === "done" ? (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : status === "resolving" ? (
            <Search className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
          ) : (
            <span className="w-4 h-4 mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 inline-block" />
          )}
          <div className="flex-1">
            <span>{message}</span>

            {/* ISIN resolution progress bar */}
            {status === "resolving" && progress && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>
                    {progress.current
                      ? `Zoeken: ${progress.current}…`
                      : `ISIN-lookup via OpenFIGI / Yahoo Finance / Stooq…`}
                  </span>
                  <span>{progress.resolved} / {progress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(progress.resolved / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} posities met waarschuwing:
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 pl-6">• {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
