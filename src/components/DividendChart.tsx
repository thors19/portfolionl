"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DividendRecord } from "@/lib/types";

interface Props {
  records: DividendRecord[];
}

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function parseMonth(datum: string): number {
  // Handles both ISO (2025-04-17) and Dutch (17-04-2025) date formats
  if (!datum) return -1;
  if (datum.includes("-") && datum.indexOf("-") === 4) {
    return new Date(datum).getMonth();
  }
  // dd-mm-yyyy
  const parts = datum.split(/[-/]/);
  if (parts.length === 3) return parseInt(parts[1], 10) - 1;
  return new Date(datum).getMonth();
}

export default function DividendChart({ records }: Props) {
  const maandData = MAANDEN.map((maand, idx) => {
    const inMaand = records.filter((r) => parseMonth(r.datum) === idx);
    return {
      maand,
      bruto: inMaand.reduce((s, r) => s + r.brutoBedrag, 0),
      netto: inMaand.reduce((s, r) => s + r.nettoBedrag, 0),
    };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Dividend per maand</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={maandData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="maand" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `€${v}`} />
          <Tooltip
            formatter={(value, name) => [
              `€ ${Number(value).toFixed(2)}`,
              name === "bruto" ? "Bruto" : "Netto",
            ]}
          />
          <Legend formatter={(v) => (v === "bruto" ? "Bruto" : "Netto")} />
          <Bar dataKey="bruto" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          <Bar dataKey="netto" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
