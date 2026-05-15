"use client";

import { usePortfolio } from "@/lib/portfolioContext";
import DividendChart from "@/components/DividendChart";
import StatCard from "@/components/StatCard";
import Link from "next/link";
import { Euro, TrendingUp, Calendar, Info } from "lucide-react";

export default function DividendPage() {
  const { dividends } = usePortfolio();

  if (dividends.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dividend tracker</h1>
          <p className="text-slate-500 mt-1">Overzicht van ontvangen dividenden en bronbelasting</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
          <Info className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500">Nog geen dividenddata geïmporteerd.</p>
          <Link
            href="/beheer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Ga naar Beheer → Dividend import
          </Link>
        </div>
      </div>
    );
  }

  const totaalBruto = dividends.reduce((s, r) => s + r.brutoBedrag, 0);
  const totaalNetto = dividends.reduce((s, r) => s + r.nettoBedrag, 0);
  const totaalBelasting = dividends.reduce((s, r) => s + r.dividendbelasting, 0);
  const gemiddeldPerMaand = totaalNetto / 12;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dividend tracker</h1>
        <p className="text-slate-500 mt-1">Overzicht van ontvangen dividenden en bronbelasting</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Bruto dividend"
          value={`€ ${totaalBruto.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          icon={<Euro className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Netto ontvangen"
          value={`€ ${totaalNetto.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Dividendbelasting"
          value={`€ ${totaalBelasting.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          subValue="Controleer je belastingaangifte"
          icon={<Euro className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Gem. per maand"
          value={`€ ${gemiddeldPerMaand.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          icon={<Calendar className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <DividendChart records={dividends} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Dividendhistorie ({dividends.length} uitkeringen)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Datum</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Product</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Bruto</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Netto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...dividends]
                .sort((a, b) => b.datum.localeCompare(a.datum))
                .map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{r.datum}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.naam}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      € {r.brutoBedrag.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      € {r.nettoBedrag.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        <strong>Tip:</strong> Dividendbelasting die in het buitenland is ingehouden, kun je verrekenen via je Nederlandse belastingaangifte.
        Bewaar je DEGIRO jaaroverzichten als bewijs.
      </div>
    </div>
  );
}
