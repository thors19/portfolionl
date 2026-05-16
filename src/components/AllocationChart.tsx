"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePortfolio } from "@/lib/portfolioContext";
import { StockPosition, CryptoPosition } from "@/lib/types";

// Kleuren passend bij de type-badges in PortfolioOverview
const COLORS: Record<string, string> = {
  "ETF":       "#2563eb",  // blue-600  — badge E
  "Aandelen":  "#16a34a",  // green-600 — badge A
  "Bitcoin":   "#f97316",  // orange-500 — bitcoin oranje
  "Crypto":    "#7c3aed",  // violet-600 — badge C
  "Goud":      "#d97706",  // amber-600 — badge M
  "Zilver":    "#94a3b8",  // slate-400
  "Platina":   "#6366f1",  // indigo-500
  "Palladium": "#14b8a6",  // teal-500
  "Koper":     "#ea580c",  // orange-600
  "Overig":    "#cbd5e1",  // slate-300 — badge D
};

const METAL_LABEL: Record<string, string> = {
  goud: "Goud", zilver: "Zilver", platina: "Platina",
  palladium: "Palladium", koper: "Koper",
};

function isEtf(s: StockPosition) {
  return s.assetType === "etf" || s.assetCategorie === "etf";
}
function isAandeel(s: StockPosition) {
  return !isEtf(s) && (s.assetType === "aandeel" || s.assetCategorie === "aandeel");
}
function isBitcoin(c: CryptoPosition) {
  return c.coinGeckoId === "bitcoin"
    || c.naam.toLowerCase() === "bitcoin"
    || c.naam.toLowerCase() === "btc";
}

export default function AllocationChart() {
  const { stocks, crypto, metals } = usePortfolio();

  const etfWaarde     = stocks.filter(isEtf).reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const aandeelWaarde = stocks.filter(isAandeel).reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const overigWaarde  = stocks.filter(s => !isEtf(s) && !isAandeel(s)).reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const bitcoinWaarde = crypto.filter(isBitcoin).reduce((s, c) => s + (c.marktwaarde ?? 0), 0);
  const cryptoWaarde  = crypto.filter(c => !isBitcoin(c)).reduce((s, c) => s + (c.marktwaarde ?? 0), 0);

  const metalGroups: Record<string, number> = {};
  for (const m of metals) {
    const label = METAL_LABEL[m.type] ?? m.type;
    metalGroups[label] = (metalGroups[label] ?? 0) + (m.marktwaarde ?? 0);
  }

  const data: { name: string; value: number; color: string }[] = [
    etfWaarde     > 0 && { name: "ETF",      value: etfWaarde,     color: COLORS["ETF"] },
    aandeelWaarde > 0 && { name: "Aandelen", value: aandeelWaarde, color: COLORS["Aandelen"] },
    overigWaarde  > 0 && { name: "Overig",   value: overigWaarde,  color: COLORS["Overig"] },
    bitcoinWaarde > 0 && { name: "Bitcoin",  value: bitcoinWaarde, color: COLORS["Bitcoin"] },
    cryptoWaarde  > 0 && { name: "Crypto",   value: cryptoWaarde,  color: COLORS["Crypto"] },
    ...Object.entries(metalGroups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: COLORS[name] ?? COLORS["Goud"] })),
  ].filter(Boolean) as { name: string; value: number; color: string }[];

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
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
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
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color }} />
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
