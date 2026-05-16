"use client";

import { useState, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle, Clock, Loader2, BarChart2,
  TrendingUp, TrendingDown, ShieldAlert, Pencil, Check, X, Info, Trash2,
} from "lucide-react";
import Link from "next/link";
import HistorischGrafiek from "./HistorischGrafiek";
import { AssetType, MetaalType, StoplossConfig, AssetCategorie } from "@/lib/types";
import { berekenPositieRendement, berekenCryptoRendement, fEur, fPct, fEurTeken, berekenPortfolio } from "@/lib/rendement";
import { saveAankoopkoers } from "@/lib/aankoopkoersStore";

// ─── Constanten ───────────────────────────────────────────────────────────────

const METAL_LABELS: Record<MetaalType, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina", palladium: "Palladium", koper: "Koper",
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "Fr.", JPY: "¥",
  CAD: "CA$", AUD: "A$", HKD: "HK$", SEK: "kr", NOK: "kr", DKK: "kr",
};

// Type badge: één letter zoals DEGIRO
const TYPE_BADGE: Record<string, { letter: string; cls: string }> = {
  etf:       { letter: "E", cls: "bg-blue-100 text-blue-700" },
  aandeel:   { letter: "A", cls: "bg-green-100 text-green-700" },
  crypto:    { letter: "C", cls: "bg-purple-100 text-purple-700" },
  reit:      { letter: "R", cls: "bg-teal-100 text-teal-700" },
  obligatie: { letter: "O", cls: "bg-slate-100 text-slate-600" },
  metaal:    { letter: "M", cls: "bg-amber-100 text-amber-700" },
  onbekend:  { letter: "D", cls: "bg-slate-100 text-slate-400" },
};

function getBadge(assetType: AssetType, assetCategorie?: AssetCategorie) {
  if (assetCategorie && TYPE_BADGE[assetCategorie]) return TYPE_BADGE[assetCategorie];
  if (assetType === "etf") return TYPE_BADGE.etf;
  if (assetType === "aandeel") return TYPE_BADGE.aandeel;
  return TYPE_BADGE.onbekend;
}

function fmt(n: number, currency: string, decimals = 2): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${sym} ${n.toLocaleString("nl-NL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ─── Sub-componenten ──────────────────────────────────────────────────────────

function PriceWarning({ warning, lastPriceTimestamp, degiroWaardeEur }: {
  warning: string | undefined;
  lastPriceTimestamp?: number | null;
  degiroWaardeEur?: number | null;
}) {
  if (!warning) return null;
  const isStooqFail = warning.startsWith("stooq:");
  if (!isStooqFail) {
    return (
      <div className="flex items-start gap-1 text-[10px] text-amber-600 mt-0.5">
        <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
        <span>{warning}</span>
      </div>
    );
  }
  const triedTicker = warning.slice("stooq:".length);
  const ageMs = lastPriceTimestamp ? Date.now() - lastPriceTimestamp : null;
  const isRecent = ageMs != null && ageMs < 24 * 3600 * 1000;
  if (isRecent && degiroWaardeEur) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
        <Info className="w-2.5 h-2.5 shrink-0" />
        <span>Tijdelijk geen live koers ({triedTicker})</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1 text-[10px] text-amber-600 mt-0.5">
      <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
      <span>Geen live koers voor <code className="bg-amber-100 px-0.5 rounded">{triedTicker}</code></span>
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
    <div className={`flex items-center gap-1 text-[10px] mt-0.5 font-medium ${breached ? "text-red-600" : "text-amber-600"}`}>
      <ShieldAlert className="w-2.5 h-2.5" />{breached ? "Stoploss bereikt" : "Bijna stoploss"}
    </div>
  );
}

function AssetTypeBadge({ assetType, assetCategorie, id, onUpdate }: {
  assetType: AssetType; assetCategorie?: AssetCategorie; id: string; onUpdate: (t: AssetType) => void;
}) {
  const [editing, setEditing] = useState(false);
  const badge = getBadge(assetType, assetCategorie);
  void id;
  if (editing) {
    return (
      <select autoFocus value={assetType} onBlur={() => setEditing(false)}
        onChange={(e) => { onUpdate(e.target.value as AssetType); setEditing(false); }}
        className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white w-20">
        <option value="etf">ETF</option>
        <option value="aandeel">Aandeel</option>
        <option value="onbekend">Div.</option>
      </select>
    );
  }
  return (
    <button onClick={() => setEditing(true)} title="Klik om te wijzigen"
      className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${badge.cls}`}>
      {badge.letter}
    </button>
  );
}

function InlineAankoopEditor({ huidig, onSave, onCancel }: {
  huidig: number | null; onSave: (p: number) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(huidig != null ? String(huidig).replace(".", ",") : "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  function commit() {
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) onSave(n); else onCancel();
  }
  return (
    <div className="flex items-center gap-1 justify-end">
      <input ref={ref} type="text" inputMode="decimal" value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
        placeholder="0,00"
        className="w-20 text-right px-1.5 py-0.5 border border-blue-400 rounded text-xs focus:outline-none" />
      <button onClick={commit} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-3 h-3" /></button>
      <button onClick={onCancel} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function PortfolioOverview() {
  const { activeStocks, activeCrypto, activeMetals, updateStock, removeStock, updateCrypto, removeCrypto, removeMetal } = usePortfolio();
  const { userId } = useAuth();
  const [grafiekTicker, setGrafiekTicker] = useState<{ ticker: string; naam: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);       // stock aankoopkoers
  const [editingCryptoAkId, setEditingCryptoAkId] = useState<string | null>(null); // crypto aankoopkoers
  const [editAantalId, setEditAantalId] = useState<string | null>(null); // aantal
  const [aantalDraft, setAantalDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSaveAankoopkoers(posId: string, isin: string, ticker: string, prijs: number) {
    updateStock(posId, { aankoopkoers: prijs });
    saveAankoopkoers(userId, isin || ticker, prijs);
    setEditingId(null);
  }

  function startEditAantal(id: string, huidig: number) {
    setEditAantalId(id);
    setAantalDraft(String(huidig).replace(".", ","));
  }

  function saveAantal(id: string) {
    const n = parseFloat(aantalDraft.replace(",", "."));
    if (!isNaN(n) && n > 0) updateStock(id, { aantalAandelen: n });
    setEditAantalId(null);
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

  const totaal = berekenPortfolio(activeStocks, activeCrypto, activeMetals);

  // ─── Th helper ─────────────────────────────────────────────────────────────
  const Th = ({ children, right, hide }: { children: React.ReactNode; right?: boolean; hide?: string }) => (
    <th className={`px-2 py-2.5 text-[11px] font-medium text-slate-400 whitespace-nowrap ${right ? "text-right" : "text-left"} ${hide ?? ""}`}>
      {children}
    </th>
  );

  return (
    <>
      {grafiekTicker && (
        <HistorischGrafiek ticker={grafiekTicker.ticker} naam={grafiekTicker.naam} onClose={() => setGrafiekTicker(null)} />
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Posities</h2>
          <p className="text-xs text-slate-400">{activeStocks.length + activeCrypto.length + activeMetals.length} posities</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {/* Kolomhoofden */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <Th>Naam</Th>
                <Th hide="hidden sm:table-cell">Type</Th>
                <Th right hide="hidden sm:table-cell">Aantal</Th>
                <Th right>Koers</Th>
                <Th right hide="hidden md:table-cell">Valuta</Th>
                <Th right>Waarde (EUR)</Th>
                <Th right hide="hidden lg:table-cell">Gm. aank.</Th>
                <Th right hide="hidden md:table-cell">Rend. EUR</Th>
                <Th right>Rend. %</Th>
                <Th hide="hidden md:table-cell">{""}</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* ── Aandelen & ETFs ── */}
              {activeStocks.map((s) => {
                const isPending = s.tickerBron === "pending";
                const rend = berekenPositieRendement(s);
                const rendPos = (rend.rendementPct ?? 0) >= 0;
                const currency = s.currency || "EUR";
                const sym = CURRENCY_SYMBOL[currency] ?? currency;
                const lokaal = s.lokaleKoers ?? s.huidigeKoers ?? null;
                const isFallback = !s.huidigeKoers && s.degiroWaardeEur != null;
                const waardeEur = s.marktwaarde ?? s.degiroWaardeEur ?? null;
                const stoplossBreached = s.stoploss && s.huidigeKoers && s.aankoopkoers
                  && s.huidigeKoers <= s.aankoopkoers * (1 - s.stoploss.waarde / 100);

                return (
                  <tr key={s.id} className={`group hover:bg-slate-50 transition-colors ${stoplossBreached ? "bg-red-50" : ""}`}>
                    {/* Naam + ticker eronder */}
                    <td className="px-2 py-2.5 min-w-32">
                      <div className="font-medium text-slate-800 text-xs truncate max-w-44">{s.naam}</div>
                      <div className="text-slate-400 font-mono text-[10px] mt-0.5">
                        {isPending ? "…" : (s.effectieveTicker ?? s.ticker)}
                        {s.isin && <span className="text-slate-300 ml-1">· {s.isin}</span>}
                      </div>
                      <PriceWarning warning={s.warning} lastPriceTimestamp={s.lastPriceTimestamp} degiroWaardeEur={s.degiroWaardeEur} />
                      <StoplossIndicator stoploss={s.stoploss} koers={s.huidigeKoers} aankoopkoers={s.aankoopkoers} />
                    </td>
                    {/* Type badge */}
                    <td className="px-2 py-2.5 hidden sm:table-cell">
                      <AssetTypeBadge assetType={s.assetType ?? "onbekend"} assetCategorie={s.assetCategorie} id={s.id}
                        onUpdate={(t) => updateStock(s.id, { assetType: t })} />
                    </td>
                    {/* Aantal — klikbaar om te bewerken */}
                    <td className="px-2 py-2.5 text-right hidden sm:table-cell">
                      {editAantalId === s.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input autoFocus type="text" inputMode="decimal"
                            value={aantalDraft} onChange={(e) => setAantalDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveAantal(s.id); if (e.key === "Escape") setEditAantalId(null); }}
                            className="w-16 text-right px-1.5 py-0.5 border border-blue-400 rounded text-xs focus:outline-none" />
                          <button onClick={() => saveAantal(s.id)} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditAantalId(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEditAantal(s.id, s.aantalAandelen)}
                          className="text-slate-500 hover:text-blue-600 cursor-pointer group-hover:underline decoration-dotted">
                          {s.aantalAandelen.toLocaleString("nl-NL")}
                        </button>
                      )}
                    </td>
                    {/* Koers */}
                    <td className="px-2 py-2.5 text-right font-medium text-slate-700">
                      {isPending ? (
                        <span className="flex items-center justify-end gap-1 text-slate-300">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </span>
                      ) : lokaal != null ? (
                        <span>{sym} {lokaal.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      ) : s.degiroKoers != null ? (
                        <span className="text-amber-500 flex items-center justify-end gap-0.5">
                          <Clock className="w-3 h-3" />
                          {sym} {s.degiroKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* Valuta */}
                    <td className="px-2 py-2.5 text-right text-slate-400 hidden md:table-cell">
                      {currency}
                    </td>
                    {/* Waarde EUR */}
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-800">
                      {waardeEur != null ? (
                        <div>
                          <div>€ {fEur(waardeEur)}</div>
                          {isFallback && <div className="text-[9px] text-amber-400 font-normal">DEGIRO koers</div>}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* Gem. aankoopprijs */}
                    <td className="px-2 py-2.5 text-right hidden lg:table-cell">
                      {editingId === s.id ? (
                        <InlineAankoopEditor huidig={s.aankoopkoers}
                          onSave={(p) => handleSaveAankoopkoers(s.id, s.isin, s.ticker, p)}
                          onCancel={() => setEditingId(null)} />
                      ) : s.aankoopkoers != null ? (
                        <button onClick={() => setEditingId(s.id)}
                          className="group flex items-center justify-end gap-1 text-slate-500 hover:text-blue-600 w-full">
                          <span>{sym} {s.aankoopkoers.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
                          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <button onClick={() => setEditingId(s.id)}
                          className="flex items-center justify-end gap-1 text-slate-300 hover:text-blue-500 w-full">
                          <Pencil className="w-2.5 h-2.5" /><span>Invoeren</span>
                        </button>
                      )}
                    </td>
                    {/* Rendement EUR */}
                    <td className="px-2 py-2.5 text-right hidden md:table-cell">
                      {rend.rendementEUR != null ? (
                        <span className={`font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                          {fEurTeken(rend.rendementEUR)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* Rendement % */}
                    <td className="px-2 py-2.5 text-right">
                      {rend.rendementPct != null ? (
                        <div>
                          <span className={`font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                            {rendPos ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                            {fPct(rend.rendementPct)}
                          </span>
                        </div>
                      ) : (
                        <button onClick={() => setEditingId(s.id)}
                          className="text-slate-300 hover:text-blue-500 flex items-center justify-end gap-0.5 w-full">
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </td>
                    {/* Acties: grafiek + verwijderen */}
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      {deletingId === s.id ? (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="text-[10px] text-red-500">Verwijderen?</span>
                          <button onClick={() => { removeStock(s.id); setDeletingId(null); }}
                            className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded">
                            Ja
                          </button>
                          <button onClick={() => setDeletingId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-0.5">
                            Nee
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isPending && s.ticker && (
                            <button onClick={() => setGrafiekTicker({ ticker: s.ticker, naam: s.naam })}
                              className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Koersgeschiedenis">
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => setDeletingId(s.id)}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Positie verwijderen">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ── Crypto ── */}
              {activeCrypto.map((c) => {
                const rend = berekenCryptoRendement(c);
                const rendPos = (rend.rendementPct ?? 0) >= 0;
                return (
                  <tr key={c.id} className="group hover:bg-slate-50">
                    <td className="px-2 py-2.5">
                      <div className="font-medium text-slate-800 text-xs">{c.naam}</div>
                      <div className="text-slate-400 font-mono text-[10px] mt-0.5">{c.coinGeckoId}</div>
                    </td>
                    <td className="px-2 py-2.5 hidden sm:table-cell">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TYPE_BADGE.crypto.cls}`}>C</span>
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-500 hidden sm:table-cell">
                      {c.aantalCoins.toLocaleString("nl-NL", { maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-slate-700">
                      {c.huidigeKoers != null ? fmt(c.huidigeKoers, "EUR", 4) : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-400 hidden md:table-cell">EUR</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-800">
                      {c.marktwaarde != null ? `€ ${fEur(c.marktwaarde)}` : "—"}
                    </td>
                    {/* Gem. aankoopprijs crypto — inline bewerkbaar */}
                    <td className="px-2 py-2.5 text-right hidden lg:table-cell">
                      {editingCryptoAkId === c.id ? (
                        <InlineAankoopEditor
                          huidig={c.aankoopkoers}
                          onSave={(p) => {
                            updateCrypto(c.id, {
                              aankoopkoers: p,
                              marktwaarde: c.huidigeKoers != null ? c.huidigeKoers * c.aantalCoins : c.marktwaarde,
                            });
                            saveAankoopkoers(userId, c.coinGeckoId, p);
                            setEditingCryptoAkId(null);
                          }}
                          onCancel={() => setEditingCryptoAkId(null)}
                        />
                      ) : c.aankoopkoers != null ? (
                        <button onClick={() => setEditingCryptoAkId(c.id)}
                          className="group flex items-center justify-end gap-1 text-slate-500 hover:text-blue-600 w-full">
                          <span>{fmt(c.aankoopkoers, "EUR")}</span>
                          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <button onClick={() => setEditingCryptoAkId(c.id)}
                          className="flex items-center justify-end gap-1 text-slate-300 hover:text-blue-500 w-full">
                          <Pencil className="w-2.5 h-2.5" /><span className="text-[10px]">Invoeren</span>
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right hidden md:table-cell">
                      {rend.rendementEUR != null ? (
                        <span className={`font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                          {fEurTeken(rend.rendementEUR)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {rend.rendementPct != null ? (
                        <span className={`font-medium ${rendPos ? "text-green-600" : "text-red-600"}`}>
                          {fPct(rend.rendementPct)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* Crypto verwijderen */}
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      {deletingId === c.id ? (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="text-[10px] text-red-500">Verwijderen?</span>
                          <button onClick={() => { removeCrypto(c.id); setDeletingId(null); }}
                            className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded">Ja</button>
                          <button onClick={() => setDeletingId(null)} className="text-[10px] text-slate-400 px-1 py-0.5">Nee</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(c.id)}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Verwijderen">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ── Edelmetalen ── */}
              {activeMetals.map((m) => (
                <tr key={m.id} className="group hover:bg-slate-50">
                  <td className="px-2 py-2.5">
                    <div className="font-medium text-slate-800 text-xs">{METAL_LABELS[m.type]}</div>
                    <div className="text-slate-400 font-mono text-[10px] mt-0.5">
                      {m.type === "goud" ? "xaueur" : m.type === "zilver" ? "xageur" : m.type}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 hidden sm:table-cell">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TYPE_BADGE.metaal.cls}`}>M</span>
                  </td>
                  <td className="px-2 py-2.5 text-right text-slate-500 hidden sm:table-cell">{m.grammen} g</td>
                  <td className="px-2 py-2.5 text-right font-medium text-slate-700">
                    {m.prijsPerGram != null ? `€ ${m.prijsPerGram.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}/g` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right text-slate-400 hidden md:table-cell">EUR</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-slate-800">
                    {m.marktwaarde != null ? `€ ${fEur(m.marktwaarde)}` : "—"}
                  </td>
                  <td className="px-2 py-2.5 hidden lg:table-cell" />
                  <td className="px-2 py-2.5 hidden md:table-cell" />
                  <td className="px-2 py-2.5 text-slate-300">—</td>
                  {/* Metaal verwijderen */}
                  <td className="px-2 py-2.5 hidden md:table-cell">
                    {deletingId === m.id ? (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-[10px] text-red-500">Verwijderen?</span>
                        <button onClick={() => { removeMetal(m.id); setDeletingId(null); }}
                          className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded">Ja</button>
                        <button onClick={() => setDeletingId(null)} className="text-[10px] text-slate-400 px-1 py-0.5">Nee</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(m.id)}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Verwijderen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* ── Totaalrij ── */}
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                <td className="px-2 py-3 text-slate-700 text-xs">Totaal</td>
                <td className="hidden sm:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden sm:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                {/* Totale waarde EUR */}
                <td className="px-2 py-3 text-right text-slate-800">
                  € {fEur(totaal.totaalWaarde)}
                </td>
                {/* Totaal geïnvesteerd */}
                <td className="px-2 py-3 text-right text-slate-600 hidden lg:table-cell">
                  {totaal.totaalGeïnvesteerd > 0 ? `€ ${fEur(totaal.totaalGeïnvesteerd)}` : "—"}
                </td>
                {/* Totaal rendement EUR */}
                <td className="px-2 py-3 text-right hidden md:table-cell">
                  {totaal.totaalGeïnvesteerd > 0 && (
                    <span className={totaal.rendementEUR >= 0 ? "text-green-600" : "text-red-600"}>
                      {fEurTeken(totaal.rendementEUR)}
                    </span>
                  )}
                </td>
                {/* Totaal rendement % */}
                <td className="px-2 py-3 text-right">
                  {totaal.totaalGeïnvesteerd > 0 && (
                    <span className={`font-bold ${totaal.rendementPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fPct(totaal.rendementPct)}
                    </span>
                  )}
                </td>
                <td className="hidden md:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
