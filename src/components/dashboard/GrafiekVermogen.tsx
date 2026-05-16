"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { loadSnapshots, filterSnapshots, Snapshot } from "@/lib/snapshots";
import { fEur, fEurTeken, fPct } from "@/lib/rendement";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

type Periode = "1W" | "1M" | "3M" | "6M" | "1J" | "Alles";
const PERIODES: Periode[] = ["1W", "1M", "3M", "6M", "1J", "Alles"];

function formatXLabel(datum: string, periode: Periode): string {
  const d = new Date(datum);
  if (periode === "1W") return d.toLocaleDateString("nl-NL", { weekday: "short" });
  if (periode === "1M") return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

interface TooltipPayload {
  datum: string;
  waarde: number;
  geïnvesteerd: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: TooltipPayload }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rEur = d.waarde - d.geïnvesteerd;
  const rPct = d.geïnvesteerd > 0 ? (rEur / d.geïnvesteerd) * 100 : 0;
  const pos = rEur >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-44">
      <p className="text-slate-500 text-xs mb-2 font-medium">
        {new Date(d.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Waarde</span>
          <span className="font-semibold text-slate-800">€ {fEur(d.waarde)}</span>
        </div>
        {d.geïnvesteerd > 0 && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Geïnvesteerd</span>
              <span className="text-slate-600">€ {fEur(d.geïnvesteerd)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 mt-1">
              <span className="text-slate-500">Rendement</span>
              <span className={`font-semibold ${pos ? "text-green-600" : "text-red-600"}`}>
                {fEurTeken(rEur)} ({fPct(rPct)})
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GrafiekVermogen() {
  const { userId } = useAuth();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [periode, setPeriode] = useState<Periode>("3M");

  useEffect(() => {
    if (!userId) return;
    setSnapshots(loadSnapshots(userId));
  }, [userId]);

  const filtered = filterSnapshots(snapshots, periode);

  const data = filtered.map((s) => ({
    datum: s.datum,
    label: formatXLabel(s.datum, periode),
    waarde: s.totaalWaarde,
    geïnvesteerd: s.totaalGeïnvesteerd,
  }));

  const minWaarde = Math.min(...data.map((d) => Math.min(d.waarde, d.geïnvesteerd))) * 0.98;
  const maxWaarde = Math.max(...data.map((d) => Math.max(d.waarde, d.geïnvesteerd))) * 1.02;

  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Vermogensontwikkeling</h2>
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Klik op &quot;Koersen bijwerken&quot; om de eerste snapshot op te slaan.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800">Vermogensontwikkeling</h2>
        <div className="flex gap-1">
          {PERIODES.map((p) => (
            <button key={p} onClick={() => setPeriode(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                periode === p ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Nog niet genoeg data voor deze periode.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickCount={6} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              domain={[minWaarde, maxWaarde]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => v === "waarde" ? "Portefeuillewaarde" : "Geïnvesteerd"} />
            {data[0]?.geïnvesteerd > 0 && (
              <Line type="monotone" dataKey="geïnvesteerd" stroke="#94a3b8" strokeWidth={1.5}
                dot={false} strokeDasharray="5 3" name="Geïnvesteerd" />
            )}
            <Line type="monotone" dataKey="waarde" stroke="#16a34a" strokeWidth={2.5}
              dot={false} name="Portefeuillewaarde"
              activeDot={{ r: 4, fill: "#16a34a" }} />
            <ReferenceLine y={data[0]?.geïnvesteerd || 0} stroke="#e2e8f0" strokeDasharray="2 4" />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-slate-400 mt-2 text-right">
        {snapshots.length} dag{snapshots.length !== 1 ? "en" : ""} data beschikbaar
      </p>
    </div>
  );
}
