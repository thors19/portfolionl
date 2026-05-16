"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PricePoint { date: string; close: number }

interface Props {
  ticker: string;
  naam: string;
  onClose: () => void;
}

export default function HistorischGrafiek({ ticker, naam, onClose }: Props) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [performance, setPerformance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/history?ticker=${encodeURIComponent(ticker)}&normalize=false`)
      .then((r) => r.json())
      .then((d: { data: PricePoint[]; performance: number | null }) => {
        setData(d.data ?? []);
        setPerformance(d.performance ?? null);
      })
      .catch(() => setError("Historische data niet beschikbaar"))
      .finally(() => setLoading(false));
  }, [ticker]);

  const chartData = data.map((d) => ({ date: d.date.slice(5), koers: d.close }));
  const positief = (performance ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-semibold text-slate-800">{naam}</h2>
              <p className="text-xs text-slate-400">{ticker} · Koersgeschiedenis 1 jaar</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading && <p className="text-center text-slate-400 py-12">Data ophalen…</p>}
          {error && <p className="text-center text-red-500 py-12">{error}</p>}

          {!loading && !error && (
            <>
              {performance != null && (
                <div className="mb-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    positief ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {positief ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {positief ? "+" : ""}{performance.toFixed(2)}% afgelopen jaar
                  </div>
                </div>
              )}

              {data.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Geen historische data beschikbaar voor {ticker}.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickCount={8} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={["auto", "auto"]}
                      tickFormatter={(v) => v.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} />
                    <Tooltip
                      formatter={(v) => [Number(v).toLocaleString("nl-NL", { minimumFractionDigits: 2 }), "Koers"]}
                      labelFormatter={(l) => `Datum: ${l}`}
                    />
                    <Line type="monotone" dataKey="koers" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-slate-400 mt-3 text-center">Bron: Stooq.com</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
