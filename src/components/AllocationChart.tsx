"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePortfolio } from "@/lib/portfolioContext";

const COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4338ca",
];

export default function AllocationChart() {
  const { stocks, crypto, metals } = usePortfolio();

  const totalStocks = stocks.reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const totalCrypto = crypto.reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const totalGoud = metals.filter((m) => m.type === "goud").reduce((s, m) => s + (m.marktwaarde ?? 0), 0);
  const totalZilver = metals.filter((m) => m.type === "zilver").reduce((s, m) => s + (m.marktwaarde ?? 0), 0);

  const data = [
    totalStocks > 0 && { name: "Aandelen / ETF", value: totalStocks },
    totalCrypto > 0 && { name: "Crypto", value: totalCrypto },
    totalGoud > 0 && { name: "Goud", value: totalGoud },
    totalZilver > 0 && { name: "Zilver", value: totalZilver },
  ].filter(Boolean) as { name: string; value: number }[];

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Importeer posities om de verdeling te zien</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Verdeling per categorie</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              `€ ${Number(value).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`,
              "Waarde",
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-slate-600">{d.name}</span>
            </div>
            <span className="text-slate-500 font-medium">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
