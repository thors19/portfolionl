"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { StockPosition, CryptoPosition, MetalPosition, DividendRecord, DoelgewichtSettings, MetaalType } from "./types";
import { getExchangeCurrency } from "./exchangeMap";

const DEFAULT_DOELGEWICHT: DoelgewichtSettings = { etf: 50, aandeel: 25, crypto: 15, metalen: 10 };

// Conversion factors: price per Stooq unit → EUR per gram
const METAL_GRAM_FACTOR: Record<MetaalType, number> = {
  goud:      0.0321507,   // troy oz per gram
  zilver:    0.0321507,
  platina:   0.0321507,
  palladium: 0.0321507,
  koper:     0.00220462,  // pound per gram
};

const METAL_STOOQ: Record<MetaalType, { ticker: string; currency: string }> = {
  goud:      { ticker: "xaueur", currency: "EUR" },
  zilver:    { ticker: "xageur", currency: "EUR" },
  platina:   { ticker: "xptusd", currency: "USD" },
  palladium: { ticker: "xpdusd", currency: "USD" },
  koper:     { ticker: "hgusd",  currency: "USD" },
};

interface PortfolioContextType {
  stocks: StockPosition[];
  crypto: CryptoPosition[];
  metals: MetalPosition[];
  dividends: DividendRecord[];
  doelgewicht: DoelgewichtSettings;
  isLoading: boolean;
  lastUpdated: string | null;
  setStocks: (s: StockPosition[]) => void;
  updateStock: (id: string, patch: Partial<StockPosition>) => void;
  addCrypto: (c: CryptoPosition) => void;
  removeCrypto: (id: string) => void;
  updateCryptoAmount: (id: string, amount: number) => void;
  addMetal: (m: MetalPosition) => void;
  removeMetal: (id: string) => void;
  updateMetalAmount: (id: string, grammen: number) => void;
  setDividends: (d: DividendRecord[]) => void;
  setDoelgewicht: (d: DoelgewichtSettings) => void;
  refreshPrices: () => Promise<void>;
  clearAll: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);
const STORAGE_KEY = "portfolionl-v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function save(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function buildStooqParam(s: StockPosition): string {
  const currency = getExchangeCurrency(s.exchange);
  return `${s.ticker}:${currency}`;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocksState] = useState<StockPosition[]>([]);
  const [crypto, setCryptoState] = useState<CryptoPosition[]>([]);
  const [metals, setMetalsState] = useState<MetalPosition[]>([]);
  const [dividends, setDividendsState] = useState<DividendRecord[]>([]);
  const [doelgewicht, setDoelgewichtState] = useState<DoelgewichtSettings>(DEFAULT_DOELGEWICHT);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = load();
    setStocksState(saved.stocks ?? []);
    setCryptoState(saved.crypto ?? []);
    setMetalsState(saved.metals ?? []);
    setDividendsState(saved.dividends ?? []);
    setDoelgewichtState(saved.doelgewicht ?? DEFAULT_DOELGEWICHT);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    save({ stocks, crypto, metals, dividends, doelgewicht });
  }, [stocks, crypto, metals, dividends, doelgewicht, hydrated]);

  const refreshPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const updates: Promise<void>[] = [];

      // ---- Stocks via Stooq ----
      if (stocks.length > 0) {
        const fetchable = stocks.filter((s) => s.tickerBron !== "pending" && s.tickerBron !== "onbekend");
        const tickerParams = [...new Set(fetchable.map(buildStooqParam))];

        if (tickerParams.length > 0) {
          updates.push(
            fetch(`/api/quotes?tickers=${tickerParams.join(",")}`)
              .then((r) => r.json())
              .then((data: Record<string, { priceEur: number; currency: string; error?: string }>) => {
                setStocksState((prev) =>
                  prev.map((s) => {
                    if (s.tickerBron === "pending" || s.tickerBron === "onbekend") return s;
                    const entry = data[s.ticker];
                    if (!entry) return s;
                    if (entry.error) {
                      return {
                        ...s,
                        marktwaarde: s.degiroWaardeEur ?? null,
                        warning: `Live koers niet beschikbaar. ${s.degiroWaardeEur ? "DEGIRO slotkoers als fallback." : ""}`,
                      };
                    }
                    return {
                      ...s,
                      huidigeKoers: entry.priceEur,
                      huidigeKoersValuta: "EUR",
                      marktwaarde: entry.priceEur * s.aantalAandelen,
                      warning: undefined,
                    };
                  })
                );
              })
              .catch(() => {})
          );
        }
      }

      // ---- Crypto via CoinGecko ----
      if (crypto.length > 0) {
        const ids = crypto.map((c) => c.coinGeckoId).join(",");
        updates.push(
          fetch(`/api/crypto?action=price&ids=${ids}`)
            .then((r) => r.json())
            .then((data: Record<string, { eur: number }>) => {
              setCryptoState((prev) =>
                prev.map((c) => {
                  const price = data[c.coinGeckoId]?.eur ?? null;
                  return { ...c, huidigeKoers: price, marktwaarde: price != null ? price * c.aantalCoins : null };
                })
              );
            })
            .catch(() => {})
        );
      }

      // ---- Metals via Stooq (per metal type with correct conversion) ----
      if (metals.length > 0) {
        const uniqueTypes = [...new Set(metals.map((m) => m.type))];
        const tickerParams = uniqueTypes
          .map((t) => `${METAL_STOOQ[t].ticker}:${METAL_STOOQ[t].currency}`)
          .join(",");

        updates.push(
          fetch(`/api/quotes?tickers=${tickerParams}`)
            .then((r) => r.json())
            .then((data: Record<string, { priceEur: number; error?: string }>) => {
              setMetalsState((prev) =>
                prev.map((m) => {
                  const { ticker } = METAL_STOOQ[m.type];
                  const pricePerUnit = data[ticker]?.priceEur ?? null; // EUR per troy oz or EUR per pound
                  const pricePerGram = pricePerUnit != null ? pricePerUnit * METAL_GRAM_FACTOR[m.type] : null;
                  return { ...m, prijsPerGram: pricePerGram, marktwaarde: pricePerGram != null ? pricePerGram * m.grammen : null };
                })
              );
            })
            .catch(() => {})
        );
      }

      await Promise.all(updates);
      setLastUpdated(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setIsLoading(false);
    }
  }, [stocks, crypto, metals]);

  const setStocks = useCallback((s: StockPosition[]) => setStocksState(s), []);
  const updateStock = useCallback((id: string, patch: Partial<StockPosition>) => {
    setStocksState((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);
  const addCrypto = useCallback((c: CryptoPosition) => {
    setCryptoState((prev) => [...prev.filter((p) => p.coinGeckoId !== c.coinGeckoId), c]);
  }, []);
  const removeCrypto = useCallback((id: string) => setCryptoState((p) => p.filter((c) => c.id !== id)), []);
  const updateCryptoAmount = useCallback((id: string, aantalCoins: number) => {
    setCryptoState((prev) => prev.map((c) => c.id === id
      ? { ...c, aantalCoins, marktwaarde: c.huidigeKoers != null ? c.huidigeKoers * aantalCoins : null } : c));
  }, []);
  const addMetal = useCallback((m: MetalPosition) => setMetalsState((p) => [...p, m]), []);
  const removeMetal = useCallback((id: string) => setMetalsState((p) => p.filter((m) => m.id !== id)), []);
  const updateMetalAmount = useCallback((id: string, grammen: number) => {
    setMetalsState((prev) => prev.map((m) => m.id === id
      ? { ...m, grammen, marktwaarde: m.prijsPerGram != null ? m.prijsPerGram * grammen : null } : m));
  }, []);
  const setDividends = useCallback((d: DividendRecord[]) => setDividendsState(d), []);
  const setDoelgewicht = useCallback((d: DoelgewichtSettings) => setDoelgewichtState(d), []);
  const clearAll = useCallback(() => {
    setStocksState([]); setCryptoState([]); setMetalsState([]); setDividendsState([]);
    setDoelgewichtState(DEFAULT_DOELGEWICHT); setLastUpdated(null);
  }, []);

  return (
    <PortfolioContext.Provider value={{
      stocks, crypto, metals, dividends, doelgewicht, isLoading, lastUpdated,
      setStocks, updateStock, addCrypto, removeCrypto, updateCryptoAmount,
      addMetal, removeMetal, updateMetalAmount, setDividends, setDoelgewicht,
      refreshPrices, clearAll,
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
