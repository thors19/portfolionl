"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolioContext";
import { AlertTriangle, Clock, Loader2, BarChart2, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";
import Link from "next/link";
import HistorischGrafiek from "./HistorischGrafiek";
import { AssetType, MetaalType, StoplossConfig } from "@/lib/types";

const METAL_LABELS: Record<MetaalType, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina", palladium: "Palladium", koper: "Koper",
};

function AssetTypeBadge({ type, id, onUpdate }: { type: AssetType; id: string; onUpdate: (t: AssetType) => void }) {
  const [editing, setEditing] = useState(false);
  const cfg: Record<AssetType, string> = {
    etf:      "bg-blue-100 text-blue-700",
    aandeel:  "bg-green-100 text-green-700",
    onbekend: "bg-slate-100 text-slate-500",
  };
  const label: Record<AssetType, string> = { etf: "ETF", aandeel: "Aandeel", onbekend: "?" };

  if (editing) {
    return (
      <select
        autoFocus
        value={type}
        onBlur={() => setEditing(false)}
        onChange={(e) => { onUpdate(e.target.value as AssetType); setEditing(false); }}
        className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white"
      >
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

function StoplossIndicator({ stoploss, koers, aankoopkoers }: {
  stoploss: StoplossConfig | null;
  koers: number | null;
  aankoopkoers: number | null;
}) {
  if (!stoploss || !koers) return null;

  let breached = false;
  let within5 = false;

  if (stoploss.type === "percentage" && aankoopkoers) {
    const stopprijs = aankoopkoers * (1 - stoploss.waarde / 100);
    breached = koers <= stopprijs;
    within5 = !breached && koers <= stopprijs * 1.05;
  } else if (stoploss.type === "absoluut") {
    breached = koers <= stoploss.waarde;
    within5 = !breached && koers <= stoploss.waarde * 1.05;
  }

  if (!breached && !within5) return null;

  return (
    <div className={`flex items-center gap-1 text-xs mt-0.5 font-medium ${breached ? "text-red-600" : "text-amber-600"}`}>
      <ShieldAlert className="w-3 h-3" />
      {breached ? `Stoploss bereikt!` : `Bijna stoploss`}
    </div>
  );
}

function RendementCell({ huidigeKoers, aankoopkoers, aantalAandelen }: {
  huidigeKoers: number | null;
  aankoopkoers: number | null;
  aantalAandelen: number;
}) {
  if (!huidigeKoers || !aankoopkoers) return <span className="text-slate-300 text-sm">—</span>;
  const rEur = (huidigeKoers - aankoopkoers) * aantalAandelen;
  const rPct = ((huidigeKoers - aankoopkoers) / aankoopkoers) * 100;
  const pos = rEur >= 0;
  return (
    <div className={`text-sm ${pos ? "text-green-600" : "text-red-600"}`}>
      <div className="flex items-center justify-end gap-1 font-medium">
        {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {pos ? "+" : ""}€ {Math.abs(rEur).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
      </div>
      <div className="text-xs text-right">{pos ? "+" : ""}{rPct.toFixed(2)}%</div>
    </div>
  );
}

export default function PortfolioOverview() {
  const { stocks, crypto, metals, updateStock } = usePortfolio();
  const [grafiekTicker, setGrafiekTicker] = useState<{ ticker: string; naam: string } | null>(null);

  const hasAnything = stocks.length > 0 || crypto.length > 0 || metals.length > 0;

  if (!hasAnything) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
        <p className="text-slate-400 mb-3">Nog geen posities in je portefeuille.</p>
        <Link href="/beheer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Ga naar Beheer →
        </Link>
      </div>
    );
  }

  return (
    <>
      {grafiekTicker && (
        <HistorischGrafiek
          ticker={grafiekTicker.ticker}
          naam={grafiekTicker.naam}
          onClose={() => setGrafiekTicker(null)}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Alle posities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Naam</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Aantal</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Koers</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Rendement</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Waarde</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Stocks */}
              {stocks.map((s) => {
                const isPending = s.tickerBron === "pending";
                const isFallback = !s.huidigeKoers && (s.degiroWaardeEur != null || s.degiroKoers != null);
                const displayWaarde = s.marktwaarde ?? s.degiroWaardeEur ?? null;

                return (
                  <tr key={s.id} className={`hover:bg-slate-50 ${
                    s.stoploss && s.huidigeKoers && s.aankoopkoers &&
                    s.huidigeKoers <= s.aankoopkoers * (1 - s.stoploss.waarde / 100)
                      ? "bg-red-50" : ""
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{s.naam}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {isPending ? s.isin : s.ticker}
                        {s.isin && !isPending && ` · ${s.isin}`}
                      </div>
                      {s.warning && (
                        <div className="flex items-start gap-1 text-xs text-amber-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{s.warning}</span>
                        </div>
                      )}
                      <StoplossIndicator stoploss={s.stoploss} koers={s.huidigeKoers} aankoopkoers={s.aankoopkoers} />
                    </td>
                    <td className="px-4 py-3">
                      <AssetTypeBadge
                        type={s.assetType ?? "onbekend"}
                        id={s.id}
                        onUpdate={(t) => updateStock(s.id, { assetType: t })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.aantalAandelen}</td>
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <span className="flex items-center justify-end gap-1 text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin" /><span className="text-xs">Opzoeken…</span>
                        </span>
                      ) : s.huidigeKoers != null ? (
                        <span className="text-slate-600">
                          € {s.huidigeKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                        </span>
                      ) : s.degiroKoers != null ? (
                        <span className="text-amber-600 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {s.degiroKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} {s.currency}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RendementCell
                        huidigeKoers={s.huidigeKoers}
                        aankoopkoers={s.aankoopkoers}
                        aantalAandelen={s.aantalAandelen}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {displayWaarde != null ? (
                        <div>
                          <span className="font-medium text-slate-800">
                            € {displayWaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                          </span>
                          {isFallback && !isPending && (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-amber-500 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />DEGIRO slotkoers
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isPending && s.ticker && (
                        <button
                          onClick={() => setGrafiekTicker({ ticker: s.ticker, naam: s.naam })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Koersgeschiedenis tonen"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Crypto */}
              {crypto.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.naam}</div>
                    <div className="text-xs text-slate-400">{c.coinGeckoId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Crypto</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {c.aantalCoins.toLocaleString("nl-NL", { maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {c.huidigeKoers != null
                      ? `€ ${c.huidigeKoers.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right"><span className="text-slate-300">—</span></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {c.marktwaarde != null
                      ? `€ ${c.marktwaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}

              {/* Metals */}
              {metals.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{METAL_LABELS[m.type]}</div>
                    <div className="text-xs text-slate-400">Stooq · {m.grammen} g</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Metaal</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{m.grammen} g</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {m.prijsPerGram != null
                      ? `€ ${m.prijsPerGram.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/g` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right"><span className="text-slate-300">—</span></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {m.marktwaarde != null
                      ? `€ ${m.marktwaarde.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
