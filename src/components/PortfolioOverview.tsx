"use client";

import { useState, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, Clock, Loader2, BarChart2, TrendingUp, TrendingDown, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown, Info, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import HistorischGrafiek from "./HistorischGrafiek";
import { AssetType, MetaalType, StoplossConfig } from "@/lib/types";
import { berekenPositieRendement, berekenCryptoRendement, fEur, fPct, fEurTeken } from "@/lib/rendement";
import { saveAankoopkoers } from "@/lib/aankoopkoersStore";

const METAL_LABELS: Record<MetaalType, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina", palladium: "Palladium", koper: "Koper",
};

type SortCol = "naam" | "koers" | "rendementEur" | "rendementPct" | "waarde";
type SortDir = "asc" | "desc";

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "Fr", JPY: "¥",
  CAD: "C$", AUD: "A$", HKD: "HK$", SEK: "kr", NOK: "kr",
  DKK: "kr", PLN: "zł", TRY: "₺", BRL: "R$", CNY: "¥",
};

function formatKoers(lokaleKoers: number | null, eurKoers: number | null, currency: string): React.ReactNode {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const isEur = currency === "EUR";

  if (lokaleKoers != null && lokaleKoers > 0) {
    if (isEur) {
      return <span className="text-slate-700 text-xs">€ {fEur(lokaleKoers)}</span>;
    }
    return (
      <div>
        <div className="text-slate-700 text-xs font-medium">
          {sym} {lokaleKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </div>
        {eurKoers != null && (
          <div className="text-[10px] text-slate-400">
            ≈ € {fEur(eurKoers)}
          </div>
        )}
      </div>
    );
  }
  if (eurKoers != null) {
    return <span className="text-slate-700 text-xs">€ {fEur(eurKoers)}</span>;
  }
  return null;
}

function SortIcon({ col, activeCol, dir }: { col: SortCol; activeCol: SortCol; dir: SortDir }) {
  if (col !== activeCol) return <ArrowUpDown className="w-3 h-3 inline ml-1 text-slate-300" />;
  return dir === "asc"
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-blue-500" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-blue-500" />;
}

function AssetTypeBadge({ type, id, onUpdate }: { type: AssetType; id: string; onUpdate: (t: AssetType) => void }) {
  const [editing, setEditing] = useState(false);
  const cfg: Record<AssetType, string> = {
    etf: "bg-blue-100 text-blue-700", aandeel: "bg-green-100 text-green-700", onbekend: "bg-slate-100 text-slate-500",
  };
  const label: Record<AssetType, string> = { etf: "ETF", aandeel: "Aandeel", onbekend: "?" };
  if (editing) {
    return (
      <select autoFocus value={type} onBlur={() => setEditing(false)}
        onChange={(e) => { onUpdate(e.target.value as AssetType); setEditing(false); }}
        className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white">
        <option value="etf">ETF</option>
        <option value="aandeel">Aandeel</option>
        <option value="onbekend">Onbekend</option>
      </select>
    );
  }
  return (
    <button onClick={() => setEditing(true)} title="Klik om te wijzigen"
      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 ${cfg[type]}`}>
      {label[type]}
    </button>
  );
  void id;
}

/**
 * Toont een koers-waarschuwing op basis van het `warning`-veld.
 * Formaat "stooq:ticker" = Stooq kon geen koers vinden.
 * Verberg het oranje blok als lastPriceTimestamp < 24u oud is.
 */
function PriceWarning({ warning, lastPriceTimestamp, degiroWaardeEur }: {
  warning: string | undefined;
  lastPriceTimestamp: number | null | undefined;
  degiroWaardeEur: number | null | undefined;
}) {
  if (!warning) return null;

  const isStooqFail = warning.startsWith("stooq:");
  if (!isStooqFail) {
    // Generieke waarschuwing (bijv. ISIN-lookup mislukt)
    return (
      <div className="flex items-start gap-1 text-xs text-amber-600 mt-0.5">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        <span>{warning}</span>
      </div>
    );
  }

  const triedTicker = warning.slice("stooq:".length);
  const ageMs = lastPriceTimestamp ? Date.now() - lastPriceTimestamp : null;
  const isRecent = ageMs != null && ageMs < 24 * 3600 * 1000; // < 24 uur

  function ageLabel(ms: number): string {
    if (ms < 3600000) return `${Math.round(ms / 60000)} min geleden`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)} uur geleden`;
    return `${Math.round(ms / 86400000)} dag${ms > 172800000 ? "en" : ""} geleden`;
  }

  if (isRecent && degiroWaardeEur) {
    // Subtiele grijze notitie — niet storend
    return (
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
        <Info className="w-2.5 h-2.5 shrink-0" />
        <span>Live koers tijdelijk niet beschikbaar ({triedTicker})</span>
      </div>
    );
  }

  // Geen recente koers bekend — toon oranje waarschuwing met context
  return (
    <div className="flex items-start gap-1 text-xs text-amber-600 mt-0.5">
      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        Geen live koers voor <code className="bg-amber-100 px-0.5 rounded text-[10px]">{triedTicker}</code>
        {!degiroWaardeEur && " — geen fallback beschikbaar"}
        {ageMs ? ` · Laatste koers ${ageLabel(ageMs)}` : ""}
      </span>
    </div>
  );
}

function StoplossIndicator({ stoploss, koers, aankoopkoers }: {
  stoploss: StoplossConfig | null; koers: number | null; aankoopkoers: number | null;
}) {
  if (!stoploss || !koers) return null;
  let breached = false, within5 = false;
  if (stoploss.type === "percentage" && aankoopkoers) {
    const stop = aankoopkoers * (1 - stoploss.waarde / 100);
    breached = koers <= stop; within5 = !breached && koers <= stop * 1.05;
  } else if (stoploss.type === "absoluut") {
    breached = koers <= stoploss.waarde; within5 = !breached && koers <= stoploss.waarde * 1.05;
  }
  if (!breached && !within5) return null;
  return (
    <div className={`flex items-center gap-1 text-xs mt-0.5 font-medium ${breached ? "text-red-600" : "text-amber-600"}`}>
      <ShieldAlert className="w-3 h-3" />{breached ? "Stoploss bereikt!" : "Bijna stoploss"}
    </div>
  );
}

// ─── Inline aankoopprijs editor ──────────────────────────────────────────────

function InlineAankoopEditor({ posId, isin, ticker, huidig, onSave, onCancel }: {
  posId: string;
  isin: string;
  ticker: string;
  huidig: number | null;
  onSave: (prijs: number) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(huidig != null ? String(huidig).replace(".", ",") : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  void posId; void isin; void ticker;

  function commit() {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) onSave(n);
    else onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="0,00"
        className="w-24 text-right px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onClick={commit} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Opslaan (Enter)">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Annuleren (Esc)">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function PortfolioOverview() {
  const { activeStocks, activeCrypto, activeMetals, updateStock } = usePortfolio();
  const { userId } = useAuth();
  const [grafiekTicker, setGrafiekTicker] = useState<{ ticker: string; naam: string } | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("waarde");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Per positie: welke valuta wordt getoond — standaard = originele valuta van de positie
  const [posValuta, setPosValuta] = useState<Record<string, string>>({});

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function setDisplayValuta(posId: string, valuta: string) {
    setPosValuta(prev => ({ ...prev, [posId]: valuta }));
  }

  function getDisplayValuta(s: { id: string; currency: string }) {
    return posValuta[s.id] ?? s.currency;
  }

  function handleSaveAankoopkoers(posId: string, isin: string, ticker: string, prijs: number) {
    updateStock(posId, { aankoopkoers: prijs });
    // Sla op in persistent store (overleeft reimport)
    const key = isin || ticker;
    saveAankoopkoers(userId, key, prijs);
    setEditingId(null);
  }

  const hasAnything = activeStocks.length > 0 || activeCrypto.length > 0 || activeMetals.length > 0;

  if (!hasAnything) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
        <p className="text-slate-400 mb-3">Nog geen posities in je portefeuille.</p>
        <Link href="/beheer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Ga naar Beheer →
        </Link>
      </div>
    );
  }

  // Enrich stocks with rendement for sorting
  const enriched = activeStocks.map((s) => ({ ...s, rend: berekenPositieRendement(s) }));
  const cryptoEnriched = activeCrypto.map((c) => ({ ...c, rend: berekenCryptoRendement(c) }));

  function getValue(s: typeof enriched[0]): number {
    switch (sortCol) {
      case "koers": return s.huidigeKoers ?? -Infinity;
      case "rendementEur": return s.rend.rendementEUR ?? -Infinity;
      case "rendementPct": return s.rend.rendementPct ?? -Infinity;
      case "waarde": return s.marktwaarde ?? s.degiroWaardeEur ?? -Infinity;
      case "naam": return 0; // string sort handled separately
    }
  }

  const sortedStocks = [...enriched].sort((a, b) => {
    if (sortCol === "naam") {
      const cmp = a.naam.localeCompare(b.naam, "nl");
      return sortDir === "asc" ? cmp : -cmp;
    }
    const av = getValue(a), bv = getValue(b);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const thCls = "px-3 py-3 text-slate-500 font-medium text-left cursor-pointer hover:text-slate-700 select-none whitespace-nowrap text-xs";

  return (
    <>
      {grafiekTicker && (
        <HistorischGrafiek ticker={grafiekTicker.ticker} naam={grafiekTicker.naam} onClose={() => setGrafiekTicker(null)} />
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Alle posities</h2>
          <p className="text-xs text-slate-400">{activeStocks.length + activeCrypto.length + activeMetals.length} posities · valuta per positie instelbaar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className={thCls} onClick={() => handleSort("naam")}>
                  Naam <SortIcon col="naam" activeCol={sortCol} dir={sortDir} />
                </th>
                <th className={`${thCls} hidden sm:table-cell`}>Type</th>
                <th className="px-3 py-3 text-slate-500 font-medium text-right text-xs whitespace-nowrap">Aantal</th>
                <th className={`${thCls} text-right`} onClick={() => handleSort("koers")}>
                  Koers <SortIcon col="koers" activeCol={sortCol} dir={sortDir} />
                </th>
                <th className={`${thCls} text-right`} onClick={() => handleSort("rendementEur")}>
                  Rendement <SortIcon col="rendementEur" activeCol={sortCol} dir={sortDir} />
                </th>
                <th className={`${thCls} text-right`} onClick={() => handleSort("waarde")}>
                  Waarde <SortIcon col="waarde" activeCol={sortCol} dir={sortDir} />
                </th>
                <th className="px-3 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Stocks */}
              {sortedStocks.map((s) => {
                const isPending = s.tickerBron === "pending";
                const isFallback = !s.huidigeKoers && (s.degiroWaardeEur != null || s.degiroKoers != null);
                const rend = s.rend;
                const rendPos = rend.rendementEUR != null && rend.rendementEUR >= 0;
                const stoplossBreached = s.stoploss && s.huidigeKoers && s.aankoopkoers
                  && s.huidigeKoers <= s.aankoopkoers * (1 - s.stoploss.waarde / 100);

                // Welke valuta toont deze rij?
                const gekozenValuta = getDisplayValuta(s);
                const isLokaal = gekozenValuta !== "EUR" && s.lokaleKoers != null;
                const sym = CURRENCY_SYMBOL[gekozenValuta] ?? gekozenValuta;
                // Koers en waarde in de gekozen valuta
                const toonKoers = isLokaal ? s.lokaleKoers! : (s.huidigeKoers ?? null);
                const toonWaarde = isLokaal
                  ? s.lokaleKoers! * s.aantalAandelen
                  : (s.marktwaarde ?? s.degiroWaardeEur ?? null);
                const beschikbareValuta = [
                  ...(s.currency !== "EUR" && s.lokaleKoers != null ? [s.currency] : []),
                  "EUR",
                ].filter((v, i, a) => a.indexOf(v) === i);

                return (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${stoplossBreached ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{s.naam}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{isPending ? s.isin : s.ticker}</div>
                      <PriceWarning
                        warning={s.warning}
                        lastPriceTimestamp={s.lastPriceTimestamp}
                        degiroWaardeEur={s.degiroWaardeEur}
                      />
                      <StoplossIndicator stoploss={s.stoploss} koers={s.huidigeKoers} aankoopkoers={s.aankoopkoers} />
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <AssetTypeBadge type={s.assetType ?? "onbekend"} id={s.id}
                        onUpdate={(t) => updateStock(s.id, { assetType: t })} />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500 text-xs">{s.aantalAandelen.toLocaleString("nl-NL")}</td>
                    <td className="px-3 py-3 text-right">
                      {isPending ? (
                        <span className="flex items-center justify-end gap-1 text-slate-400 text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" />Opzoeken…
                        </span>
                      ) : toonKoers != null ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-slate-700 text-xs font-medium">
                            {sym} {toonKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                          {/* Valuta-wisselaar chips */}
                          {beschikbareValuta.length > 1 && (
                            <div className="flex border border-slate-200 rounded overflow-hidden">
                              {beschikbareValuta.map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setDisplayValuta(s.id, v)}
                                  className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                    gekozenValuta === v
                                      ? "bg-blue-600 text-white"
                                      : "text-slate-400 hover:bg-slate-100"
                                  }`}
                                >
                                  {CURRENCY_SYMBOL[v] ?? v} {v}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : s.degiroKoers != null ? (
                        <span className="text-amber-600 flex items-center justify-end gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          {s.degiroKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} {s.currency}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {editingId === s.id ? (
                        /* Inline editor actief */
                        <div className="flex justify-end">
                          <InlineAankoopEditor
                            posId={s.id}
                            isin={s.isin}
                            ticker={s.ticker}
                            huidig={s.aankoopkoers}
                            onSave={(p) => handleSaveAankoopkoers(s.id, s.isin, s.ticker, p)}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      ) : rend.rendementEUR != null && rend.rendementPct != null ? (
                        /* Rendement bekend — toon met potlood-knop */
                        <div className="flex items-center justify-end gap-1 group">
                          <div className="text-right">
                            <div className={`flex items-center justify-end gap-1 text-xs font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                              {rendPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {fEurTeken(rend.rendementEUR)}
                            </div>
                            <div className={`text-xs ${rendPos ? "text-green-500" : "text-red-500"}`}>
                              {fPct(rend.rendementPct)}
                            </div>
                            <div className="text-[10px] text-slate-300">
                              {/* aankoopkoers altijd in lokale valuta */}
                              gk: {CURRENCY_SYMBOL[s.currency] ?? s.currency} {s.aankoopkoers!.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingId(s.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded"
                            title="Aankoopprijs aanpassen"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        /* Geen aankoopkoers — toon uitnodiging */
                        <button
                          onClick={() => setEditingId(s.id)}
                          className="flex items-center justify-end gap-1.5 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg w-full transition-colors"
                          title="Aankoopprijs invoeren"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Aankoopprijs</span>
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {toonWaarde != null ? (
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">
                            {sym} {toonWaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                          </span>
                          {/* Toon EUR-equivalent als we in lokale modus zijn */}
                          {isLokaal && s.marktwaarde != null && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              ≈ € {fEur(s.marktwaarde)}
                            </div>
                          )}
                          {isFallback && !isPending && !isLokaal && (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-amber-500 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />DEGIRO slotkoers
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {!isPending && s.ticker && (
                        <button onClick={() => setGrafiekTicker({ ticker: s.ticker, naam: s.naam })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Koersgeschiedenis">
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Crypto */}
              {cryptoEnriched.map((c) => {
                const rend = c.rend;
                const rendPos = rend.rendementEUR != null && rend.rendementEUR >= 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800 text-sm">{c.naam}</div>
                      <div className="text-xs text-slate-400">{c.coinGeckoId}</div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Crypto</span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-500">
                      {c.aantalCoins.toLocaleString("nl-NL", { maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-700">
                      {c.huidigeKoers != null ? `€ ${fEur(c.huidigeKoers, 4)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {rend.rendementEUR != null ? (
                        <div>
                          <div className={`text-xs font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                            {fEurTeken(rend.rendementEUR)}
                          </div>
                          <div className={`text-xs ${rendPos ? "text-green-500" : "text-red-500"}`}>
                            {fPct(rend.rendementPct!)}
                          </div>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800 text-sm">
                      {c.marktwaarde != null ? `€ ${fEur(c.marktwaarde)}` : "—"}
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                );
              })}

              {/* Metals */}
              {activeMetals.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800 text-sm">{METAL_LABELS[m.type]}</div>
                    <div className="text-xs text-slate-400">{m.grammen} g</div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Metaal</span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-slate-500">{m.grammen} g</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-700">
                    {m.prijsPerGram != null ? `€ ${fEur(m.prijsPerGram, 3)}/g` : "—"}
                  </td>
                  <td className="px-3 py-3 text-right"><span className="text-slate-300 text-xs">—</span></td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-800 text-sm">
                    {m.marktwaarde != null ? `€ ${fEur(m.marktwaarde)}` : "—"}
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
