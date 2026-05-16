"use client";

import { useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { usePortfolio } from "@/lib/portfolioContext";

// Box 3 tarieven 2025 (forfaitair stelsel)
const HEFFINGVRIJ_2025 = 57000;
const HEFFINGVRIJ_PARTNER = 114000;
const BELASTINGPERCENTAGE = 0.36; // 36% over fictief rendement

// Fictief rendement percentages 2025 (spaarvariant)
const FICTIEF_SPAREN = 0.0151;
const FICTIEF_BELEGGEN = 0.0603;
const FICTIEF_SCHULDEN = 0.0225;

interface Resultaat {
  grondslag: number;
  heffingvrij: number;
  belastbaarvermogen: number;
  fictievRendement: number;
  teBetalenBelasting: number;
  effectiefTarief: number;
}

function berekenBox3(
  banktegoeden: number,
  beleggingen: number,
  schulden: number,
  fiscaalPartner: boolean
): Resultaat {
  const vrijstelling = fiscaalPartner ? HEFFINGVRIJ_PARTNER : HEFFINGVRIJ_2025;
  const grondslag = banktegoeden + beleggingen - schulden;
  const belastbaarvermogen = Math.max(0, grondslag - vrijstelling);

  // Verdeel proportioneel over sparen en beleggen
  const totaalActiva = banktegoeden + beleggingen || 1;
  const spaardeel = belastbaarvermogen * (banktegoeden / totaalActiva);
  const belegdeel = belastbaarvermogen * (beleggingen / totaalActiva);

  const fictievRendement =
    spaardeel * FICTIEF_SPAREN +
    belegdeel * FICTIEF_BELEGGEN -
    (schulden > 0 ? Math.min(schulden, belastbaarvermogen) * FICTIEF_SCHULDEN : 0);

  const teBetalenBelasting = Math.max(0, fictievRendement * BELASTINGPERCENTAGE);
  const effectiefTarief = grondslag > 0 ? (teBetalenBelasting / grondslag) * 100 : 0;

  return {
    grondslag,
    heffingvrij: vrijstelling,
    belastbaarvermogen,
    fictievRendement,
    teBetalenBelasting,
    effectiefTarief,
  };
}

export default function Box3Calculator() {
  const { stocks, crypto, metals } = usePortfolio();

  const portfolioWaarde = Math.round(
    stocks.reduce((s, p) => s + (p.marktwaarde ?? 0), 0) +
    crypto.reduce((s, p) => s + (p.marktwaarde ?? 0), 0) +
    metals.reduce((s, p) => s + (p.marktwaarde ?? 0), 0)
  );

  const [banktegoeden, setBanktegoeden] = useState(25000);
  const [beleggingen, setBeleggingen] = useState(() => portfolioWaarde > 0 ? portfolioWaarde : 13194);
  const [schulden, setSchulden] = useState(0);
  const [fiscaalPartner, setFiscaalPartner] = useState(false);

  const portfolioGevuld = portfolioWaarde > 0;
  const r = berekenBox3(banktegoeden, beleggingen, schulden, fiscaalPartner);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Invoer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-800">Invoer (peildatum 1 jan 2025)</h2>

        <InputField
          label="Banktegoeden"
          value={banktegoeden}
          onChange={setBanktegoeden}
          hint={`Fictief rendement: ${(FICTIEF_SPAREN * 100).toFixed(2)}%`}
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">Beleggingen &amp; effecten</label>
            {portfolioGevuld && (
              <button
                onClick={() => setBeleggingen(portfolioWaarde)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                title="Gebruik huidige portfoliowaarde"
              >
                <RefreshCw className="w-3 h-3" />
                € {portfolioWaarde.toLocaleString("nl-NL")} vanuit portfolio
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
            <input
              type="number"
              value={beleggingen}
              onChange={(e) => setBeleggingen(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={0}
              step={100}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Fictief rendement: {(FICTIEF_BELEGGEN * 100).toFixed(2)}%</p>
        </div>
        <InputField
          label="Schulden (drempel €3.400)"
          value={schulden}
          onChange={setSchulden}
          hint={`Aftrek: ${(FICTIEF_SCHULDEN * 100).toFixed(2)}%`}
        />

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="partner"
            checked={fiscaalPartner}
            onChange={(e) => setFiscaalPartner(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="partner" className="text-sm text-slate-700">
            Fiscaal partner (vrijstelling verdubbeld: € {HEFFINGVRIJ_PARTNER.toLocaleString("nl-NL")})
          </label>
        </div>
      </div>

      {/* Resultaat */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Berekening Box 3</h2>

        <ResultRow label="Totaal vermogen (grondslag)" value={`€ ${r.grondslag.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`} />
        <ResultRow label="Heffingvrij vermogen" value={`− € ${r.heffingvrij.toLocaleString("nl-NL")}`} muted />
        <div className="border-t border-slate-100 pt-3">
          <ResultRow label="Belastbaar vermogen" value={`€ ${r.belastbaarvermogen.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`} bold />
        </div>
        <ResultRow label="Fictief rendement" value={`€ ${r.fictievRendement.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`} muted />
        <ResultRow label="Belastingpercentage" value="36%" muted />
        <div className="border-t border-slate-100 pt-3">
          <ResultRow
            label="Te betalen vermogensbelasting"
            value={`€ ${r.teBetalenBelasting.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
            bold
            highlight={r.teBetalenBelasting > 0}
          />
        </div>
        <ResultRow label="Effectief tarief op vermogen" value={`${r.effectiefTarief.toFixed(2)}%`} muted />

        {r.belastbaarvermogen === 0 && (
          <div className="bg-green-50 text-green-700 rounded-lg p-4 text-sm font-medium mt-2">
            Je valt onder de vrijstelling — geen Box 3 belasting!
          </div>
        )}
      </div>

      {/* Uitleg */}
      <div className="lg:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 flex gap-3">
        <Info className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <strong>Let op:</strong> Deze calculator gebruikt het forfaitaire stelsel (2025). De Hoge Raad heeft geoordeeld dat
          het stelsel in strijd kan zijn met eigendomsrecht als het fictieve rendement hoger is dan het werkelijke rendement.
          Raadpleeg een belastingadviseur voor je persoonlijke situatie. Drempel schulden: € 3.400 per persoon (niet meegenomen in vereenvoudigde berekening).
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min={0}
          step={100}
        />
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, muted, bold, highlight }: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-600"} ${highlight ? "text-red-600" : ""}`}>
        {value}
      </span>
    </div>
  );
}
