"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { loadSnapshots, berekenStatistieken } from "@/lib/snapshots";
import { fEur, fEurTeken } from "@/lib/rendement";
import { Award, TrendingDown, Calendar, BarChart2 } from "lucide-react";

export default function PortfolioStats() {
  const { userId } = useAuth();
  const [stats, setStats] = useState<ReturnType<typeof berekenStatistieken> | null>(null);
  const [aantalSnapshots, setAantalSnapshots] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const snaps = loadSnapshots(userId);
    setAantalSnapshots(snaps.length);
    if (snaps.length > 1) setStats(berekenStatistieken(snaps));
  }, [userId]);

  if (!stats || aantalSnapshots < 2) return null;

  const items = [
    {
      icon: Award,
      label: "All-time high",
      value: `€ ${fEur(stats.allTimeHigh)}`,
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: TrendingDown,
      label: "All-time low",
      value: `€ ${fEur(stats.allTimeLow)}`,
      color: "text-slate-500 bg-slate-50",
    },
    {
      icon: Award,
      label: "Beste dag",
      value: stats.besteDag ? `${fEurTeken(stats.besteDag.verandering)}` : "—",
      sub: stats.besteDag ? new Date(stats.besteDag.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "",
      color: "text-green-600 bg-green-50",
    },
    {
      icon: TrendingDown,
      label: "Slechtste dag",
      value: stats.slechteDag ? `${fEurTeken(stats.slechteDag.verandering)}` : "—",
      sub: stats.slechteDag ? new Date(stats.slechteDag.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "",
      color: "text-red-600 bg-red-50",
    },
    {
      icon: Calendar,
      label: "Dagen in de plus",
      value: `${stats.dagenPositief}`,
      sub: `van ${stats.dagenPositief + stats.dagenNegatief} dagen`,
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: BarChart2,
      label: "Snapshots bewaard",
      value: `${aantalSnapshots}`,
      sub: "maximaal 730 dagen",
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Portfolio statistieken</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 leading-tight mb-1">{item.label}</p>
            <p className="text-sm font-bold text-slate-800">{item.value}</p>
            {item.sub && <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
