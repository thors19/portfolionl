/**
 * Stock & metals price API using Stooq.com (free, no API key required).
 *
 * Stooq ticker format (always lowercase):
 *   Amsterdam (EUR):  asml.nl, inga.nl
 *   XETRA (EUR):      sap.de, siemens.de
 *   London (GBP):     shel.uk, bp.uk
 *   US (USD):         msft.us, aapl.us
 *   Gold (EUR/oz):    xaueur
 *   Silver (EUR/oz):  xageur
 *
 * Non-EUR prices are converted using Stooq FX tickers:
 *   USD→EUR: usdeur
 *   GBP→EUR: gbpeur
 *   CHF→EUR: chfeur   etc.
 */

import { NextRequest, NextResponse } from "next/server";

const STOOQ_BASE = "https://stooq.com/q/l/";

// 10-minute cache — aggressive enough to not hit Stooq rate limits
const cache = new Map<string, { price: number; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

async function fetchStooqPrice(stooqTicker: string): Promise<number | null> {
  const now = Date.now();
  const hit = cache.get(stooqTicker);
  if (hit && now - hit.ts < CACHE_TTL) return hit.price;

  const url = `${STOOQ_BASE}?s=${encodeURIComponent(stooqTicker)}&f=c`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; portfolionl)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    // Stooq returns just the close price (or "N/D" if unavailable)
    if (!text || text === "N/D") return null;
    const price = parseFloat(text);
    if (isNaN(price) || price <= 0) return null;
    cache.set(stooqTicker, { price, ts: now });
    return price;
  } catch {
    return null;
  }
}

/**
 * Input format for a single quote request.
 * The stooqTicker is already constructed by the client (from exchangeMap).
 * Expected currency is also provided by the client.
 *
 * GET /api/quotes?tickers=asml.nl:EUR,msft.us:USD,shel.uk:GBP,xaueur:EUR,xageur:EUR
 *
 * Response: { "asml.nl": { priceEur, pricOriginal, currency, error? } }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Each ticker entry is "stooqTicker:CURRENCY" (e.g. "asml.nl:EUR")
  const rawEntries = (searchParams.get("tickers") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawEntries.length === 0)
    return NextResponse.json({ error: "Geen tickers opgegeven" }, { status: 400 });

  // Parse ticker:currency pairs
  const requests = rawEntries.map((entry) => {
    const [ticker, currency = "EUR"] = entry.split(":");
    return { ticker, currency };
  });

  // Determine which FX rates we need
  const nonEurCurrencies = [...new Set(
    requests.filter((r) => r.currency !== "EUR").map((r) => r.currency)
  )];

  // Fetch all prices in parallel (main tickers + FX rates)
  const fxTickers = nonEurCurrencies.map((c) => `${c.toLowerCase()}eur`);
  const allTickers = [...requests.map((r) => r.ticker), ...fxTickers];

  const allPrices = await Promise.all(allTickers.map(fetchStooqPrice));
  const priceMap: Record<string, number | null> = {};
  allTickers.forEach((t, i) => { priceMap[t] = allPrices[i]; });

  // Build FX rate map
  const fxRates: Record<string, number> = {};
  for (const [c, ft] of nonEurCurrencies.map((c, i) => [c, fxTickers[i]] as const)) {
    const r = priceMap[ft];
    if (r && r > 0) fxRates[c] = r;
  }

  // Build response
  type QuoteResult = { priceEur: number; pricOriginal: number; currency: string; error?: string };
  const result: Record<string, QuoteResult> = {};

  for (const { ticker, currency } of requests) {
    const p = priceMap[ticker];
    if (p == null || p <= 0) {
      result[ticker] = {
        priceEur: 0,
        pricOriginal: 0,
        currency,
        error: `Koers niet gevonden voor "${ticker}". Controleer of het Stooq-ticker correct is.`,
      };
      continue;
    }

    // Convert to EUR
    let priceEur = p;
    if (currency === "GBp") {
      priceEur = (p / 100) * (fxRates["GBP"] ?? 0);
    } else if (currency !== "EUR") {
      priceEur = (fxRates[currency] ?? 0) > 0 ? p * fxRates[currency] : 0;
    }

    result[ticker] = { priceEur, pricOriginal: p, currency };
  }

  return NextResponse.json(result);
}
