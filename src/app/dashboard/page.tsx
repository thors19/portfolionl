"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { usePortfolio } from "@/lib/portfolioContext";
import AllocationChart from "@/components/AllocationChart";
import PortfolioOverview from "@/components/PortfolioOverview";
import DoelgewichtSection from "@/components/DoelgewichtSection";
import ExportButton from "@/components/ExportButton";
import PortfolioSwitcher from "@/components/portfolio/PortfolioSwitcher";
import PeriodeKaarten from "@/components/dashboard/PeriodeKaarten";
import GrafiekVermogen from "@/components/dashboard/GrafiekVermogen";
import WinnaarVerliezer from "@/components/dashboard/WinnaarVerliezer";
import PortfolioStats from "@/components/dashboard/PortfolioStats";
import { berekenPortfolio } from "@/lib/rendement";
import { RefreshCw, Clock } from "lucide-react";

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const {
    activeStocks, activeCrypto, activeMetals,
    isLoading, lastUpdated, refreshPrices, activePortfolioId,
  } = usePortfolio();

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const onboarded = localStorage.getItem(`portfolionl_${userId}_onboarded`);
    if (!onboarded) router.push("/onboarding");
  }, [isLoaded, userId, router]);

  const berekening = berekenPortfolio(activeStocks, activeCrypto, activeMetals);
  const { totaalWaarde, totaalGeïnvesteerd, rendementEUR, rendementPct } = berekening;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
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

      {/* Rendement kaarten + periodes */}
      <PeriodeKaarten
        huidigWaarde={totaalWaarde}
        totaalGeïnvesteerd={totaalGeïnvesteerd}
        rendementEUR={rendementEUR}
        rendementPct={rendementPct}
      />

      {/* Groei grafiek */}
      <GrafiekVermogen />

      {/* Winnaars & verliezers */}
      <WinnaarVerliezer />

      {/* Posities + verdeling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioOverview />
        </div>
        <div>
          <AllocationChart />
        </div>
      </div>

      {/* Doelgewicht */}
      <DoelgewichtSection />

      {/* Portfolio statistieken */}
      <PortfolioStats />
    </div>
  );
}
