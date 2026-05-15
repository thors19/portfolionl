"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { SimulatorDataPoint } from "@/lib/types";

function simuleer(
  beginvermogen: number,
  maandelijksBedrag: number,
  looptijdJaren: number,
  rendementProcent: number,
  dividendProcent: number,
): SimulatorDataPoint[] {
  const punten: SimulatorDataPoint[] = [];
  let vermogen = beginvermogen;
  let totaalInleg = beginvermogen;
  let totaalRendement = 0;
  let totaalDividend = 0;
  const jaarRente = rendementProcent / 100;
  const jaarDividend = dividendProcent / 100;

  for (let jaar = 1; jaar <= looptijdJaren; jaar++) {
    for (let maand = 0; maand < 12; maand++) {
      vermogen += maandelijksBedrag;
      totaalInleg += maandelijksBedrag;
      const maandRente = vermogen * (jaarRente / 12);
      const maandDividend = vermogen * (jaarDividend / 12);
      vermogen += maandRente + maandDividend;
      totaalRendement += maandRente;
      totaalDividend += maandDividend;
    }
    punten.push({
      jaar,
      vermogen: Math.round(vermogen),
      inleg: Math.round(totaalInleg),
      rendement: Math.round(totaalRendement),
      dividend: Math.round(totaalDividend),
    });
  }
  return punten;
}

export default function InlegSimulator() {
  const [beginvermogen, setBeginvermogen] = useState(13194);
  const [maandelijksBedrag, setMaandelijksBedrag] = useState(300);
  const [looptijdJaren, setLooptijdJaren] = useState(20);
  const [rendement, setRendement] = useState(7);
  const [dividend, setDividend] = useState(2.5);

  const data = useMemo(
    () => simuleer(beginvermogen, maandelijksBedrag, looptijdJaren, rendement, dividend),
    [beginvermogen, maandelijksBedrag, looptijdJaren, rendement, dividend]
  );

  const eindwaarde = data[data.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instellingen */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-800">Parameters</h2>

          <SliderField
            label="Beginvermogen"
            value={beginvermogen}
            onChange={setBeginvermogen}
            min={0}
            max={100000}
            step={500}
            format="euro"
          />
          <SliderField
            label="Maandelijkse inleg"
            value={maandelijksBedrag}
            onChange={setMaandelijksBedrag}
            min={0}
            max={2000}
            step={25}
            format="euro"
          />
          <SliderField
            label="Looptijd"
            value={looptijdJaren}
            onChange={setLooptijdJaren}
            min={1}
            max={40}
            step={1}
            format="jaar"
          />
          <SliderField
            label="Verwacht rendement"
            value={rendement}
            onChange={setRendement}
            min={0}
            max={20}
            step={0.5}
            format="procent"
          />
          <SliderField
            label="Dividendrendement"
            value={dividend}
            onChange={setDividend}
            min={0}
            max={10}
            step={0.25}
            format="procent"
          />
        </div>

        {/* Resultaten */}
        <div className="lg:col-span-2 space-y-4">
          {/* Samenvattingkaarten */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniCard label={`Eindwaarde (${looptijdJaren}j)`} value={`€ ${(eindwaarde?.vermogen ?? 0).toLocaleString("nl-NL")}`} color="blue" />
            <MiniCard label="Totale inleg" value={`€ ${(eindwaarde?.inleg ?? 0).toLocaleString("nl-NL")}`} color="slate" />
            <MiniCard label="Koersrendement" value={`€ ${(eindwaarde?.rendement ?? 0).toLocaleString("nl-NL")}`} color="green" />
            <MiniCard label="Dividend totaal" value={`€ ${(eindwaarde?.dividend ?? 0).toLocaleString("nl-NL")}`} color="amber" />
          </div>

          {/* Grafiek */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Vermogensgroei over tijd</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVermogen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInleg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="jaar"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(v) => `${v}j`}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v, name) => [
                    `€ ${Number(v).toLocaleString("nl-NL")}`,
                    name === "vermogen" ? "Totaal vermogen" : name === "inleg" ? "Ingelegd" : name,
                  ]}
                  labelFormatter={(v) => `Jaar ${v}`}
                />
                <Legend
                  formatter={(v) =>
                    v === "vermogen" ? "Totaal vermogen" : v === "inleg" ? "Ingelegd kapitaal" : v
                  }
                />
                <Area type="monotone" dataKey="inleg" stroke="#94a3b8" fill="url(#gradInleg)" strokeWidth={2} />
                <Area type="monotone" dataKey="vermogen" stroke="#2563eb" fill="url(#gradVermogen)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Groei per jaar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Jaar</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Totale inleg</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Koersrendement</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Dividend</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Eindwaarde</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Vermogensgroei</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 15)) === 0 || i === data.length - 1).map((d) => (
                <tr key={d.jaar} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{d.jaar}</td>
                  <td className="px-4 py-3 text-right text-slate-600">€ {d.inleg.toLocaleString("nl-NL")}</td>
                  <td className="px-4 py-3 text-right text-green-600">€ {d.rendement.toLocaleString("nl-NL")}</td>
                  <td className="px-4 py-3 text-right text-amber-600">€ {d.dividend.toLocaleString("nl-NL")}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">€ {d.vermogen.toLocaleString("nl-NL")}</td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    +{(((d.vermogen - d.inleg) / d.inleg) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, format }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: "euro" | "procent" | "jaar";
}) {
  const display =
    format === "euro" ? `€ ${value.toLocaleString("nl-NL")}`
    : format === "procent" ? `${value}%`
    : `${value} jaar`;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-blue-600">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>{format === "euro" ? `€${min}` : format === "procent" ? `${min}%` : `${min}j`}</span>
        <span>{format === "euro" ? `€${max.toLocaleString("nl-NL")}` : format === "procent" ? `${max}%` : `${max}j`}</span>
      </div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    slate: "text-slate-700 bg-slate-50 border-slate-200",
    green: "text-green-700 bg-green-50 border-green-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
