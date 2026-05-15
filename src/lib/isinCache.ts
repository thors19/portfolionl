"use client";

import { ISINLookupResult } from "./types";

const CACHE_KEY = "portfolionl-isin-cache-v1";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

type CacheEntry = ISINLookupResult & { resolvedAt: number };
type CacheStore = Record<string, CacheEntry>;

function readCache(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function writeCache(store: CacheStore) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {}
}

export function getCachedISIN(isin: string): ISINLookupResult | null {
  const store = readCache();
  const entry = store[isin];
  if (!entry) return null;
  if (Date.now() - entry.resolvedAt > CACHE_TTL) return null; // expired
  return { stooqTicker: entry.stooqTicker, ticker: entry.ticker, exchange: entry.exchange, source: entry.source };
}

export function setCachedISIN(isin: string, result: ISINLookupResult) {
  const store = readCache();
  store[isin] = { ...result, resolvedAt: Date.now() };
  writeCache(store);
}

export function clearISINCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}
