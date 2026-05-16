"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  StockPosition, CryptoPosition, MetalPosition, DividendRecord,
  DoelgewichtSettings, MetaalType, Portfolio, BrokerNaam,
} from "./types";
import { getExchangeCurrency } from "./exchangeMap";
import { v4 as uuidv4 } from "uuid";
import { saveSnapshot } from "./snapshots";
import { berekenPortfolio } from "./rendement";

// ─── Constanten ───────────────────────────────────────────────────────────────

const DEFAULT_DOELGEWICHT: DoelgewichtSettings = { etf: 50, aandeel: 25, crypto: 15, metalen: 10 };

export const DEFAULT_PORTFOLIO_ID = "default";

const DEFAULT_PORTFOLIO: Portfolio = {
  id: DEFAULT_PORTFOLIO_ID,
  naam: "Mijn portefeuille",
  kleur: "#2563eb",
  broker: "DEGIRO",
  aangemaaktOp: new Date().toISOString(),
  laatsteImport: null,
};

const METAL_GRAM_FACTOR: Record<MetaalType, number> = {
  goud: 0.0321507, zilver: 0.0321507, platina: 0.0321507,
  palladium: 0.0321507, koper: 0.00220462,
};

const METAL_STOOQ: Record<MetaalType, { ticker: string; currency: string }> = {
  goud:      { ticker: "xaueur", currency: "EUR" },
  zilver:    { ticker: "xageur", currency: "EUR" },
  platina:   { ticker: "xptusd", currency: "USD" },
  palladium: { ticker: "xpdusd", currency: "USD" },
  koper:     { ticker: "hgusd",  currency: "USD" },
};

// ─── Context interface ────────────────────────────────────────────────────────

interface PortfolioContextType {
  // Data
  portfolios: Portfolio[];
  stocks: StockPosition[];
  crypto: CryptoPosition[];
  metals: MetalPosition[];
  dividends: DividendRecord[];
  doelgewicht: DoelgewichtSettings;
  // Actieve portefeuille (null = alles gecombineerd)
  activePortfolioId: string | null;
  // Status
  isLoading: boolean;
  lastUpdated: string | null;
  // Portefeuille beheer
  addPortfolio: (naam: string, kleur: string, broker: BrokerNaam) => Portfolio;
  updatePortfolio: (id: string, patch: Partial<Portfolio>) => void;
  deletePortfolio: (id: string) => void;
  setActivePortfolio: (id: string | null) => void;
  // Posities
  setStocks: (s: StockPosition[], portfolioId?: string) => void;
  updateStock: (id: string, patch: Partial<StockPosition>) => void;
  removeStock: (id: string) => void;
  addCrypto: (c: CryptoPosition) => void;
  removeCrypto: (id: string) => void;
  updateCryptoAmount: (id: string, amount: number) => void;
  addMetal: (m: MetalPosition) => void;
  removeMetal: (id: string) => void;
  updateMetalAmount: (id: string, grammen: number) => void;
  setDividends: (d: DividendRecord[]) => void;
  setDoelgewicht: (d: DoelgewichtSettings) => void;
  refreshPrices: () => Promise<void>;
  clearPortfolio: (portfolioId: string) => void;
  clearAll: () => void;
  // Gefilterde views
  activeStocks: StockPosition[];
  activeCrypto: CryptoPosition[];
  activeMetals: MetalPosition[];
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(userId: string | null | undefined) {
  return userId ? `portfolionl_${userId}_v2` : null;
}

function load(key: string | null): Record<string, unknown> {
  if (!key) return {};
  try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; }
}

function save(key: string | null, data: object) {
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function buildStooqParam(s: StockPosition): string {
  return `${s.ticker}:${getExchangeCurrency(s.exchange)}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();

  const [portfolios, setPortfoliosState]   = useState<Portfolio[]>([DEFAULT_PORTFOLIO]);
  const [stocks,     setStocksState]       = useState<StockPosition[]>([]);
  const [crypto,     setCryptoState]       = useState<CryptoPosition[]>([]);
  const [metals,     setMetalsState]       = useState<MetalPosition[]>([]);
  const [dividends,  setDividendsState]    = useState<DividendRecord[]>([]);
  const [doelgewicht, setDoelgewichtState] = useState<DoelgewichtSettings>(DEFAULT_DOELGEWICHT);
  const [activePortfolioId, setActive]     = useState<string | null>(null);
  const [isLoading,  setIsLoading]         = useState(false);
  const [lastUpdated, setLastUpdated]      = useState<string | null>(null);
  const [hydrated,   setHydrated]          = useState(false);
  const [currentUserId, setCurrentUserId]  = useState<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    if (!isLoaded) return;
    const key = storageKey(userId);
    const saved = load(key) as {
      portfolios?: Portfolio[];
      stocks?: StockPosition[];
      crypto?: CryptoPosition[];
      metals?: MetalPosition[];
      dividends?: DividendRecord[];
      doelgewicht?: DoelgewichtSettings;
    };

    // Migrate v1 data if v2 is empty
    if (!saved.stocks && userId) {
      const v1 = (() => { try { return JSON.parse(localStorage.getItem(`portfolionl_${userId}_v1`) ?? "{}"); } catch { return {}; } })() as {
        stocks?: StockPosition[]; crypto?: CryptoPosition[]; metals?: MetalPosition[]; dividends?: DividendRecord[];
      };
      if (v1.stocks?.length || v1.crypto?.length || v1.metals?.length) {
        const migrated = {
          portfolios: [DEFAULT_PORTFOLIO],
          stocks: (v1.stocks ?? []).map((s) => ({ ...s, portfolioId: DEFAULT_PORTFOLIO_ID, broker: "DEGIRO" as BrokerNaam })),
          crypto:  (v1.crypto  ?? []).map((c) => ({ ...c, portfolioId: DEFAULT_PORTFOLIO_ID, broker: "DEGIRO" as BrokerNaam })),
          metals:  (v1.metals  ?? []).map((m) => ({ ...m, portfolioId: DEFAULT_PORTFOLIO_ID, broker: "DEGIRO" as BrokerNaam })),
          dividends: v1.dividends ?? [],
          doelgewicht: DEFAULT_DOELGEWICHT,
        };
        setPortfoliosState(migrated.portfolios);
        setStocksState(migrated.stocks);
        setCryptoState(migrated.crypto);
        setMetalsState(migrated.metals);
        setDividendsState(migrated.dividends);
        save(key, migrated);
        setHydrated(true); setCurrentUserId(userId ?? null); return;
      }
    }

    setPortfoliosState(saved.portfolios?.length ? saved.portfolios : [DEFAULT_PORTFOLIO]);
    setStocksState(saved.stocks ?? []);
    setCryptoState(saved.crypto ?? []);
    setMetalsState(saved.metals ?? []);
    setDividendsState(saved.dividends ?? []);
    setDoelgewichtState(saved.doelgewicht ?? DEFAULT_DOELGEWICHT);
    setCurrentUserId(userId ?? null);
    setHydrated(true);
  }, [isLoaded, userId]);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    const key = storageKey(userId);
    save(key, { portfolios, stocks, crypto, metals, dividends, doelgewicht });
  }, [portfolios, stocks, crypto, metals, dividends, doelgewicht, hydrated, userId]);

  // Switch user
  useEffect(() => {
    if (!isLoaded || !hydrated || userId === currentUserId) return;
    const key = storageKey(userId);
    const saved = load(key) as { portfolios?: Portfolio[]; stocks?: StockPosition[]; crypto?: CryptoPosition[]; metals?: MetalPosition[] };
    setPortfoliosState(saved.portfolios?.length ? saved.portfolios : [DEFAULT_PORTFOLIO]);
    setStocksState(saved.stocks ?? []);
    setCryptoState(saved.crypto ?? []);
    setMetalsState(saved.metals ?? []);
    setCurrentUserId(userId ?? null);
  }, [userId, currentUserId, isLoaded, hydrated]);

  // ── Filtered views ────────────────────────────────────────────────────────

  const activeStocks = activePortfolioId
    ? stocks.filter((s) => s.portfolioId === activePortfolioId)
    : stocks;

  const activeCrypto = activePortfolioId
    ? crypto.filter((c) => c.portfolioId === activePortfolioId)
    : crypto;

  const activeMetals = activePortfolioId
    ? metals.filter((m) => m.portfolioId === activePortfolioId)
    : metals;

  // ── Price refresh ─────────────────────────────────────────────────────────

  const refreshPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const updates: Promise<void>[] = [];

      // Stocks
      const fetchable = stocks.filter((s) => s.tickerBron !== "pending" && s.tickerBron !== "onbekend");
      const params = [...new Set(fetchable.map(buildStooqParam))];
      if (params.length > 0) {
        updates.push(
          fetch(`/api/quotes?tickers=${params.join(",")}`)
            .then((r) => r.json())
            .then((data: Record<string, { priceEur: number; error?: string }>) => {
              setStocksState((prev) => prev.map((s) => {
                if (s.tickerBron === "pending" || s.tickerBron === "onbekend") return s;
                const entry = data[s.ticker];
                if (!entry) return s;
                if (entry.error) return { ...s, marktwaarde: s.degiroWaardeEur ?? null, warning: `Live koers niet beschikbaar. ${s.degiroWaardeEur ? "Fallback actief." : ""}` };
                return { ...s, huidigeKoers: entry.priceEur, huidigeKoersValuta: "EUR", marktwaarde: entry.priceEur * s.aantalAandelen, warning: undefined };
              }));
            }).catch(() => {})
        );
      }

      // Crypto
      if (crypto.length > 0) {
        const ids = [...new Set(crypto.map((c) => c.coinGeckoId))].join(",");
        updates.push(
          fetch(`/api/crypto?action=price&ids=${ids}`)
            .then((r) => r.json())
            .then((data: Record<string, { eur: number }>) => {
              setCryptoState((prev) => prev.map((c) => {
                const price = data[c.coinGeckoId]?.eur ?? null;
                return { ...c, huidigeKoers: price, marktwaarde: price != null ? price * c.aantalCoins : null };
              }));
            }).catch(() => {})
        );
      }

      // Metals
      if (metals.length > 0) {
        const unique = [...new Set(metals.map((m) => m.type))];
        const tickers = unique.map((t) => `${METAL_STOOQ[t].ticker}:${METAL_STOOQ[t].currency}`).join(",");
        updates.push(
          fetch(`/api/quotes?tickers=${tickers}`)
            .then((r) => r.json())
            .then((data: Record<string, { priceEur: number }>) => {
              setMetalsState((prev) => prev.map((m) => {
                const { ticker } = METAL_STOOQ[m.type];
                const priceUnit = data[ticker]?.priceEur ?? null;
                const priceGram = priceUnit != null ? priceUnit * METAL_GRAM_FACTOR[m.type] : null;
                return { ...m, prijsPerGram: priceGram, marktwaarde: priceGram != null ? priceGram * m.grammen : null };
              }));
            }).catch(() => {})
        );
      }

      await Promise.all(updates);
      setLastUpdated(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));

      // Bewaar dagelijkse snapshot na prijsupdate
      if (userId) {
        // Gebruik state-waarden na updates — setTimeout laat React state settlen
        setTimeout(() => {
          setStocksState((latestStocks) => {
            setCryptoState((latestCrypto) => {
              setMetalsState((latestMetals) => {
                const berekening = berekenPortfolio(latestStocks, latestCrypto, latestMetals);
                saveSnapshot(userId, {
                  datum: new Date().toISOString().slice(0, 10),
                  totaalWaarde: berekening.totaalWaarde,
                  totaalGeïnvesteerd: berekening.totaalGeïnvesteerd,
                  rendementEUR: berekening.rendementEUR,
                  rendementPct: berekening.rendementPct,
                });
                return latestMetals;
              });
              return latestCrypto;
            });
            return latestStocks;
          });
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  }, [stocks, crypto, metals]);

  // ── Portfolio CRUD ────────────────────────────────────────────────────────

  const addPortfolio = useCallback((naam: string, kleur: string, broker: BrokerNaam): Portfolio => {
    const p: Portfolio = { id: uuidv4(), naam, kleur, broker, aangemaaktOp: new Date().toISOString(), laatsteImport: null };
    setPortfoliosState((prev) => [...prev, p]);
    return p;
  }, []);

  const updatePortfolio = useCallback((id: string, patch: Partial<Portfolio>) => {
    setPortfoliosState((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const deletePortfolio = useCallback((id: string) => {
    setPortfoliosState((prev) => prev.filter((p) => p.id !== id));
    setStocksState((prev) => prev.filter((s) => s.portfolioId !== id));
    setCryptoState((prev) => prev.filter((c) => c.portfolioId !== id));
    setMetalsState((prev) => prev.filter((m) => m.portfolioId !== id));
    setActive((cur) => cur === id ? null : cur);
  }, []);

  const setActivePortfolio = useCallback((id: string | null) => setActive(id), []);

  // ── Position CRUD ─────────────────────────────────────────────────────────

  const setStocks = useCallback((s: StockPosition[], portfolioId?: string) => {
    if (portfolioId) {
      setStocksState((prev) => [...prev.filter((p) => p.portfolioId !== portfolioId), ...s]);
      updatePortfolio(portfolioId, { laatsteImport: new Date().toISOString() });
    } else {
      setStocksState(s);
    }
  }, [updatePortfolio]);

  const updateStock  = useCallback((id: string, patch: Partial<StockPosition>) => setStocksState((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s)), []);
  const removeStock  = useCallback((id: string) => setStocksState((p) => p.filter((s) => s.id !== id)), []);

  const addCrypto = useCallback((c: CryptoPosition) => setCryptoState((prev) => [...prev.filter((p) => !(p.coinGeckoId === c.coinGeckoId && p.portfolioId === c.portfolioId)), c]), []);
  const removeCrypto = useCallback((id: string) => setCryptoState((p) => p.filter((c) => c.id !== id)), []);
  const updateCryptoAmount = useCallback((id: string, aantalCoins: number) =>
    setCryptoState((p) => p.map((c) => c.id === id ? { ...c, aantalCoins, marktwaarde: c.huidigeKoers != null ? c.huidigeKoers * aantalCoins : null } : c)), []);

  const addMetal  = useCallback((m: MetalPosition) => setMetalsState((p) => [...p, m]), []);
  const removeMetal = useCallback((id: string) => setMetalsState((p) => p.filter((m) => m.id !== id)), []);
  const updateMetalAmount = useCallback((id: string, grammen: number) =>
    setMetalsState((p) => p.map((m) => m.id === id ? { ...m, grammen, marktwaarde: m.prijsPerGram != null ? m.prijsPerGram * grammen : null } : m)), []);

  const setDividends    = useCallback((d: DividendRecord[]) => setDividendsState(d), []);
  const setDoelgewicht  = useCallback((d: DoelgewichtSettings) => setDoelgewichtState(d), []);

  const clearPortfolio = useCallback((portfolioId: string) => {
    setStocksState((p) => p.filter((s) => s.portfolioId !== portfolioId));
    setCryptoState((p) => p.filter((c) => c.portfolioId !== portfolioId));
    setMetalsState((p) => p.filter((m) => m.portfolioId !== portfolioId));
  }, []);

  const clearAll = useCallback(() => {
    setPortfoliosState([DEFAULT_PORTFOLIO]);
    setStocksState([]); setCryptoState([]); setMetalsState([]);
    setDividendsState([]); setDoelgewichtState(DEFAULT_DOELGEWICHT);
    setActive(null); setLastUpdated(null);
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolios, stocks, crypto, metals, dividends, doelgewicht,
      activePortfolioId, isLoading, lastUpdated,
      activeStocks, activeCrypto, activeMetals,
      addPortfolio, updatePortfolio, deletePortfolio, setActivePortfolio,
      setStocks, updateStock, removeStock,
      addCrypto, removeCrypto, updateCryptoAmount,
      addMetal, removeMetal, updateMetalAmount,
      setDividends, setDoelgewicht, refreshPrices,
      clearPortfolio, clearAll,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextType {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
