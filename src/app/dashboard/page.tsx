"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { usePortfolio } from "@/lib/portfolioContext";
import StatCard from "@/components/StatCard";
import AllocationChart from "@/components/AllocationChart";
import PortfolioOverview from "@/components/PortfolioOverview";
import DoelgewichtSection from "@/components/DoelgewichtSection";
import ExportButton from "@/components/ExportButton";
import PortfolioSwitcher from "@/components/portfolio/PortfolioSwitcher";
import { Wallet, TrendingUp, Bitcoin, Gem, RefreshCw, Clock } from "lucide-react";

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { activeStocks, activeCrypto, activeMetals, isLoading, lastUpdated, refreshPrices, activePortfolioId } = usePortfolio();

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const onboarded = localStorage.getItem(`portfolionl_${userId}_onboarded`);
    if (!onboarded) router.push("/onboarding");
  }, [isLoaded, userId, router]);

  const totalEtfs     = activeStocks.filter((s) => s.assetType === "etf").reduce((sum, p) => sum + (p.marktwaarde ?? p.degiroWaardeEur ?? 0), 0);
  const totalAandelen = activeStocks.filter((s) => s.assetType !== "etf").reduce((sum, p) => sum + (p.marktwaarde ?? p.degiroWaardeEur ?? 0), 0);
  const totalStocks   = totalEtfs + totalAandelen;
  const totalCrypto   = activeCrypto.reduce((s, p) => s + (p.marktwaarde ?? 0), 0);
  const totalMetals   = activeMetals.reduce((s, m) => s + (m.marktwaarde ?? 0), 0);
  const totaal        = totalStocks + totalCrypto + totalMetals;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {activePortfolioId ? "Gefilterd op één portefeuille" : "Totaaloverzicht van alle portefeuilles"}
            </p>
          </div>
          <PortfolioSwitcher />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />Bijgewerkt: {lastUpdated}
            </span>
          )}
          <ExportButton />
          <button onClick={refreshPrices} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Bijwerken…" : "Koersen bijwerken"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Totale portefeuille"
          value={`€ ${totaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          icon={<Wallet className="w-5 h-5" />} color="blue" />
        <StatCard label="Aandelen & ETFs"
          value={`€ ${totalStocks.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          subValue={`${activeStocks.length} posities · ${activeStocks.filter((s) => s.assetType === "etf").length} ETF`}
          icon={<TrendingUp className="w-5 h-5" />} color="green" />
        <StatCard label="Crypto"
          value={`€ ${totalCrypto.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          subValue={`${activeCrypto.length} munt${activeCrypto.length !== 1 ? "en" : ""}`}
          icon={<Bitcoin className="w-5 h-5" />} color="amber" />
        <StatCard label="Edelmetalen"
          value={`€ ${totalMetals.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
          subValue={`${activeMetals.length} positie${activeMetals.length !== 1 ? "s" : ""}`}
          icon={<Gem className="w-5 h-5" />} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioOverview />
        </div>
        <div>
          <AllocationChart />
        </div>
      </div>

      <DoelgewichtSection />
    </div>
  );
}
