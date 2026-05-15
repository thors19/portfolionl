"use client";

import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";
import { MetaalType } from "@/lib/types";

const METAL_LABELS: Record<MetaalType, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina", palladium: "Palladium", koper: "Koper",
};

function escapeCsv(v: string | number | null): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ExportButton() {
  const { stocks, crypto, metals, dividends } = usePortfolio();
  const [open, setOpen] = useState(false);

  function exportCsv() {
    const rows: string[] = [];
    const today = new Date().toLocaleDateString("nl-NL");

    rows.push(`PortfolioNL Export - ${today}`);
    rows.push("");

    // === Aandelen & ETFs ===
    rows.push("AANDELEN & ETFs");
    rows.push(["Naam", "Type", "Ticker", "ISIN", "Aantal", "Koers (EUR)", "Waarde (EUR)",
      "Aankoopkoers", "Rendement EUR", "Rendement %"].map(escapeCsv).join(","));

    for (const s of stocks) {
      const rEur = s.aankoopkoers && s.huidigeKoers
        ? ((s.huidigeKoers - s.aankoopkoers) * s.aantalAandelen).toFixed(2) : "";
      const rPct = s.aankoopkoers && s.huidigeKoers
        ? (((s.huidigeKoers - s.aankoopkoers) / s.aankoopkoers) * 100).toFixed(2) + "%" : "";
      rows.push([
        s.naam, s.assetType, s.ticker, s.isin, s.aantalAandelen,
        s.huidigeKoers?.toFixed(2) ?? "",
        (s.marktwaarde ?? s.degiroWaardeEur ?? "")?.toString(),
        s.aankoopkoers?.toFixed(2) ?? "", rEur, rPct,
      ].map(escapeCsv).join(","));
    }

    rows.push("");

    // === Crypto ===
    rows.push("CRYPTO");
    rows.push(["Naam", "CoinGecko ID", "Aantal", "Koers (EUR)", "Waarde (EUR)"].map(escapeCsv).join(","));
    for (const c of crypto) {
      rows.push([c.naam, c.coinGeckoId, c.aantalCoins, c.huidigeKoers?.toFixed(4) ?? "", c.marktwaarde?.toFixed(2) ?? ""].map(escapeCsv).join(","));
    }
    rows.push("");

    // === Metalen ===
    rows.push("EDELMETALEN");
    rows.push(["Metaal", "Grammen", "Per gram (EUR)", "Waarde (EUR)"].map(escapeCsv).join(","));
    for (const m of metals) {
      rows.push([METAL_LABELS[m.type], m.grammen, m.prijsPerGram?.toFixed(4) ?? "", m.marktwaarde?.toFixed(2) ?? ""].map(escapeCsv).join(","));
    }
    rows.push("");

    // === Dividend ===
    if (dividends.length > 0) {
      rows.push("DIVIDEND");
      rows.push(["Datum", "Product", "ISIN", "Bruto (EUR)", "Belasting", "Netto (EUR)"].map(escapeCsv).join(","));
      for (const d of dividends) {
        rows.push([d.datum, d.naam, d.isin, d.brutoBedrag.toFixed(2), d.dividendbelasting.toFixed(2), d.nettoBedrag.toFixed(2)].map(escapeCsv).join(","));
      }
    }

    const csv = rows.join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolionl-export-${today.replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function exportPrint() {
    window.print();
    setOpen(false);
  }

  const hasData = stocks.length > 0 || crypto.length > 0 || metals.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={!hasData}
        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
      >
        <Download className="w-4 h-4" />
        Exporteren
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-48 overflow-hidden">
            <button onClick={exportCsv}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
              <FileText className="w-4 h-4 text-green-600" />
              Exporteer als CSV
            </button>
            <button onClick={exportPrint}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 w-full text-left border-t border-slate-100">
              <Printer className="w-4 h-4 text-blue-600" />
              Afdrukken / PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
