"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { loadSnapshots, berekeningPeriodes } from "@/lib/snapshots";
import { fEur, fEurTeken, fPct } from "@/lib/rendement";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  huidigWaarde: number;
  totaalGeïnvesteerd: number;
  rendementEUR: number;
  rendementPct: number;
}

export default function PeriodeKaarten({ huidigWaarde, totaalGeïnvesteerd, rendementEUR, rendementPct }: Props) {
  const { userId } = useAuth();
  const [periodes, setPeriodes] = useState<ReturnType<typeof berekeningPeriodes>>([]);

  useEffect(() => {
    if (!userId) return;
    const snaps = loadSnapshots(userId);
    setPeriodes(berekeningPeriodes(snaps, huidigWaarde));
  }, [userId, huidigWaarde]);

  const positief = rendementEUR >= 0;

  return (
    <div className="space-y-4">
      {/* Hoofdkaarten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 font-medium">Totaal geïnvesteerd</p>
          <p className="text-xl font-bold text-slate-800 mt-1">€ {fEur(totaalGeïnvesteerd)}</p>
          <p className="text-xs text-slate-400 mt-1">Aankoopkoers × aantal</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 font-medium">Huidige waarde</p>
          <p className="text-xl font-bold text-slate-800 mt-1">€ {fEur(huidigWaarde)}</p>
          <p className="text-xs text-slate-400 mt-1">Live koersen</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-5 ${positief ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-xs font-medium ${positief ? "text-green-700" : "text-red-700"}`}>Totaal rendement</p>
          <p className={`text-xl font-bold mt-1 ${positief ? "text-green-800" : "text-red-800"}`}>
            {fEurTeken(rendementEUR)}
          </p>
          <p className={`text-sm font-medium mt-0.5 ${positief ? "text-green-600" : "text-red-600"}`}>
            {fPct(rendementPct)}
          </p>
        </div>

        {/* Vandaag */}
        {(() => {
          const vandaag = periodes.find((p) => p.label === "Vandaag");
          const pos = vandaag?.rendementEUR != null && vandaag.rendementEUR >= 0;
          return (
            <div className={`rounded-xl border shadow-sm p-5 ${vandaag?.beschikbaar ? (pos ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200") : "bg-slate-50 border-slate-200"}`}>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                {vandaag?.beschikbaar && (pos
                  ? <TrendingUp className="w-3 h-3 text-green-600" />
                  : <TrendingDown className="w-3 h-3 text-red-600" />)}
                Dagverandering
              </p>
              {vandaag?.rendementEUR != null ? (
                <>
                  <p className={`text-xl font-bold mt-1 ${pos ? "text-green-800" : "text-red-800"}`}>
                    {fEurTeken(vandaag.rendementEUR)}
                  </p>
                  <p className={`text-sm font-medium mt-0.5 ${pos ? "text-green-600" : "text-red-600"}`}>
                    {fPct(vandaag.rendementPct!)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Geen snapshot van gisteren</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Periodekaarten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {periodes.map((p) => {
          const pos = p.rendementEUR != null && p.rendementEUR >= 0;
          return (
            <div key={p.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-400 font-medium mb-2">{p.label}</p>
              {p.beschikbaar && p.rendementEUR != null ? (
                <>
                  <p className={`text-sm font-bold ${pos ? "text-green-600" : "text-red-600"}`}>
                    {fEurTeken(p.rendementEUR)}
                  </p>
                  <p className={`text-xs mt-0.5 ${pos ? "text-green-500" : "text-red-500"}`}>
                    {fPct(p.rendementPct!)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-300">Geen data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
