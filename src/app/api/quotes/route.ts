/**
 * Koersen via Stooq.com met meervoudige fallback-keten.
 *
 * Fallback per ticker (in volgorde):
 *   1. Stooq met opgegeven ticker (bijv. asml.nl)
 *   2. Stooq met alternatieve exchange-suffixen (asml.de, asml.us, …)
 *   3. Stooq zonder suffix (asml)
 *
 * Alle pogingen worden gelogd zodat problemen debuggable zijn.
 * Non-EUR koersen worden omgezet via Stooq FX-tickers (usdeur, gbpeur, …).
 */

import { NextRequest, NextResponse } from "next/server";

const STOOQ_BASE = "https://stooq.com/q/l/";
const UA = "Mozilla/5.0 (compatible; portfolionl/1.0)";

// 10-minuten cache
const cache = new Map<string, { price: number; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

// Fallback exchange-suffixen in volgorde van populariteit voor Europese effecten
const EXCHANGE_FALLBACKS = [
  ".nl", ".de", ".us", ".uk", ".fr", ".it", ".es",
  ".ch", ".sw", ".no", ".dk", ".fi", ".be", ".pt",
];

interface StooqResult {
  price: number;
  usedTicker: string;
}

async function fetchStooqOnce(ticker: string): Promise<number | null> {
  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.price;

  const url = `${STOOQ_BASE}?s=${encodeURIComponent(ticker)}&f=c`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.log(`[quotes] ${ticker} → HTTP ${res.status}`);
      return null;
    }

    const text = (await res.text()).trim();
    const price = parseFloat(text);

    if (!text || text === "N/D" || text.startsWith("<") || isNaN(price) || price <= 0) {
      console.log(`[quotes] ${ticker} → N/D (response: "${text.slice(0, 30)}")`);
      return null;
    }

    console.log(`[quotes] ${ticker} → ${price}`);
    cache.set(ticker, { price, ts: Date.now() });
    return price;
  } catch (e) {
    console.log(`[quotes] ${ticker} → fout: ${(e as Error).message}`);
    return null;
  }
}

async function fetchStooqWithFallback(ticker: string): Promise<StooqResult | null> {
  // Stap 1: probeer ticker precies zoals opgegeven
  const p1 = await fetchStooqOnce(ticker);
  if (p1 != null) return { price: p1, usedTicker: ticker };

  // Extraheer basis-ticker (zonder exchange-suffix)
  const dotIdx = ticker.lastIndexOf(".");
  const isForex = ticker.includes("eur") || ticker.includes("usd") || ticker.endsWith("=x");

  if (isForex || dotIdx === -1) {
    // Geen suffix-fallback voor forex of bare tickers
    return null;
  }

  const base = ticker.slice(0, dotIdx);
  const currentSuffix = ticker.slice(dotIdx);

  // Stap 2: probeer alternatieve exchange-suffixen
  for (const suffix of EXCHANGE_FALLBACKS) {
    if (suffix === currentSuffix) continue;
    const alt = `${base}${suffix}`;
    const p = await fetchStooqOnce(alt);
    if (p != null) {
      console.log(`[quotes] Fallback succesvol: ${ticker} → ${alt} (${p})`);
      return { price: p, usedTicker: alt };
    }
  }

  // Stap 3: bare ticker zonder suffix
  const p3 = await fetchStooqOnce(base);
  if (p3 != null) {
    console.log(`[quotes] Bare-ticker succesvol: ${ticker} → ${base} (${p3})`);
    return { price: p3, usedTicker: base };
  }

  console.log(`[quotes] Alle varianten mislukt voor "${ticker}" (geprobeerd: ${ticker}, ${EXCHANGE_FALLBACKS.map(s => base + s).join(", ")}, ${base})`);
  return null;
}

// GET /api/quotes?tickers=asml.nl:EUR,msft.us:USD,...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawEntries = (searchParams.get("tickers") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  if (rawEntries.length === 0)
    return NextResponse.json({ error: "Geen tickers opgegeven" }, { status: 400 });

  const requests = rawEntries.map((entry) => {
    const [ticker, currency = "EUR"] = entry.split(":");
    return { ticker, currency };
  });

  // Haal FX-koersen op voor niet-EUR valuta
  const nonEurCurrencies = [...new Set(
    requests.filter((r) => r.currency !== "EUR").map((r) => r.currency)
  )];
  const fxTickers = nonEurCurrencies.map((c) => `${c.toLowerCase()}eur`);

  // Haal alles parallel op — hoofdtickers met fallback, FX-koersen direct
  const [mainResults, fxPrices] = await Promise.all([
    Promise.all(requests.map((r) => fetchStooqWithFallback(r.ticker))),
    Promise.all(fxTickers.map((ft) => fetchStooqOnce(ft).then((p) => ({ ticker: ft, price: p })))),
  ]);

  // Bouw FX-rate map
  const fxRates: Record<string, number> = {};
  for (const { ticker, price } of fxPrices) {
    if (price) fxRates[ticker.replace("eur", "").toUpperCase()] = price;
  }

  type QuoteResult = {
    priceEur: number;
    pricOriginal: number;
    currency: string;
    usedTicker?: string;   // de Stooq-ticker die daadwerkelijk werkte
    error?: string;
  };

  const result: Record<string, QuoteResult> = {};

  for (let i = 0; i < requests.length; i++) {
    const { ticker, currency } = requests[i];
    const found = mainResults[i];

    if (!found) {
      result[ticker] = {
        priceEur: 0,
        pricOriginal: 0,
        currency,
        error: `Geen koers gevonden voor "${ticker}" (ook alternatieve notaties geprobeerd).`,
      };
      continue;
    }

    let priceEur = found.price;
    if (currency === "GBp") {
      priceEur = (found.price / 100) * (fxRates["GBP"] ?? 0);
    } else if (currency !== "EUR") {
      const rate = fxRates[currency] ?? 0;
      priceEur = rate > 0 ? found.price * rate : 0;
    }

    result[ticker] = {
      priceEur,
      pricOriginal: found.price,
      currency,
      usedTicker: found.usedTicker !== ticker ? found.usedTicker : undefined,
    };
  }

  return NextResponse.json(result);
}
