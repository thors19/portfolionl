/**
 * ISIN → Stooq ticker resolver. Four-step fallback chain:
 *
 * 1. OpenFIGI (free, no key)  → ticker + exchCode → Stooq ticker
 * 2. Yahoo Finance search       → symbol (e.g. ASML.AS) → Stooq ticker
 * 3. ISIN direct on Stooq       → try fetching price with ISIN as ticker
 * 4. Name search on Yahoo       → symbol → Stooq ticker
 *
 * POST /api/isin-lookup
 * Body: [{ isin: string, naam: string }]
 * Response: { [isin]: ISINLookupResult }
 */

import { NextRequest, NextResponse } from "next/server";
import { ISINLookupResult } from "@/lib/types";

const UA = "Mozilla/5.0 (compatible; portfolionl/1.0)";

// ---- OpenFIGI exchCode → Stooq suffix ----
const FIGI_EXCH_TO_STOOQ: Record<string, string> = {
  NA: ".nl",  // Euronext Amsterdam
  AV: ".at",  // Wiener Börse (Austria)
  BB: ".be",  // Euronext Brussels
  FP: ".fr",  // Euronext Paris
  GR: ".de",  // Xetra
  GY: ".de",  // Deutsche Börse
  IM: ".it",  // Borsa Italiana
  LN: ".uk",  // London Stock Exchange
  NO: ".no",  // Oslo Bors
  PL: ".pt",  // Euronext Lisbon
  SE: ".ch",  // SIX Swiss Exchange
  SM: ".es",  // Bolsa Madrid
  SS: ".sw",  // Nasdaq Stockholm
  SQ: ".sw",  // Nasdaq Stockholm (variant)
  DC: ".dk",  // Copenhagen
  FH: ".fi",  // Helsinki OMX
  BE: ".be",  // Brussels alt
  US: ".us",  // Generic US
  UN: ".us",  // NYSE
  UQ: ".us",  // NASDAQ
  UA: ".us",  // NYSE American
  UT: ".us",  // NYSE Arca
  UP: ".us",  // OTC
  CN: ".us",  // CBOE
  CA: ".ca",  // Toronto
  AT: ".au",  // ASX Australia
  HK: ".hk",  // Hong Kong
  JT: ".jp",  // Tokyo
};

// ---- Yahoo Finance suffix → Stooq suffix ----
const YF_SUFFIX_TO_STOOQ: Record<string, string> = {
  ".AS": ".nl",  // Amsterdam
  ".DE": ".de",  // Xetra
  ".L":  ".uk",  // London
  ".PA": ".fr",  // Paris
  ".MI": ".it",  // Milan
  ".MC": ".es",  // Madrid
  ".SW": ".ch",  // Swiss
  ".ST": ".sw",  // Stockholm
  ".CO": ".dk",  // Copenhagen
  ".HE": ".fi",  // Helsinki
  ".OL": ".no",  // Oslo
  ".BR": ".be",  // Brussels
  ".LS": ".pt",  // Lisbon
  ".TO": ".ca",  // Toronto
  ".AX": ".au",  // Australia
  ".HK": ".hk",  // Hong Kong
  ".T":  ".jp",  // Tokyo
  ".VI": ".at",  // Vienna
  ".AT": ".at",  // Vienna alt
};

function yahooSymbolToStooq(symbol: string): string | null {
  const dotIdx = symbol.lastIndexOf(".");
  if (dotIdx === -1) {
    // No suffix → US exchange
    return `${symbol.toLowerCase()}.us`;
  }
  const baseTicker = symbol.slice(0, dotIdx);
  const suffix = symbol.slice(dotIdx); // e.g. ".AS"
  const stooqSuffix = YF_SUFFIX_TO_STOOQ[suffix.toUpperCase()];
  if (!stooqSuffix) return `${baseTicker.toLowerCase()}.us`; // fallback
  return `${baseTicker.toLowerCase()}${stooqSuffix}`;
}

async function fetchJson<T>(url: string, opts: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "User-Agent": UA, Accept: "application/json", ...opts.headers },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

// ISIN country code → preferred OpenFIGI exchCode(s), ordered by preference
const ISIN_COUNTRY_PREFERRED_EXCH: Record<string, string[]> = {
  NL: ["NA"],               // Netherlands → Euronext Amsterdam
  IE: ["NA", "LN"],         // Ireland ETFs → Amsterdam first, then London
  GB: ["LN"],               // UK → London
  DE: ["GR", "GY"],         // Germany → Xetra
  FR: ["FP"],               // France → Euronext Paris
  IT: ["IM"],               // Italy → Milan
  ES: ["SM"],               // Spain → Madrid
  CH: ["SE", "SW"],         // Switzerland → SIX
  SE: ["SS", "SQ"],         // Sweden → Stockholm
  DK: ["DC"],               // Denmark → Copenhagen
  FI: ["FH"],               // Finland → Helsinki
  NO: ["NO"],               // Norway → Oslo
  BE: ["BB", "BE"],         // Belgium → Brussels
  PT: ["PL"],               // Portugal → Lisbon
  US: ["UN", "UQ", "UA", "UT", "US"], // USA → NYSE, NASDAQ, etc.
  CA: ["CA"],               // Canada → Toronto
  AU: ["AT"],               // Australia → ASX
  HK: ["HK"],               // Hong Kong
  JP: ["JT"],               // Japan → Tokyo
};

// ---- Step 1: OpenFIGI ----
async function lookupOpenFIGI(isin: string): Promise<ISINLookupResult | null> {
  type FIGIItem = { ticker?: string; exchCode?: string; securityType?: string; securityType2?: string; marketSector?: string };
  type FIGIResponse = { data?: FIGIItem[]; error?: string }[];

  const data = await fetchJson<FIGIResponse>("https://api.openfigi.com/v3/mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
  });

  if (!data || !Array.isArray(data) || data[0]?.error) return null;

  const items = (data[0]?.data ?? []).filter((i) => i.ticker && i.exchCode);
  if (items.length === 0) return null;

  // Determine preferred exchanges based on ISIN country code (first 2 chars)
  const countryCode = isin.slice(0, 2).toUpperCase();
  const preferred = ISIN_COUNTRY_PREFERRED_EXCH[countryCode] ?? [];

  // Sort: preferred exchanges first, then any exchange we know
  const sorted = [
    ...preferred.flatMap((p) => items.filter((i) => i.exchCode === p)),
    ...items.filter((i) => i.exchCode && FIGI_EXCH_TO_STOOQ[i.exchCode] && !preferred.includes(i.exchCode!)),
    ...items.filter((i) => !i.exchCode || !FIGI_EXCH_TO_STOOQ[i.exchCode!]),
  ];

  // Find first item with a known Stooq suffix
  const best = sorted.find((i) => i.exchCode && FIGI_EXCH_TO_STOOQ[i.exchCode]) ?? sorted[0];

  if (!best?.ticker) return null;

  const stooqSuffix = best.exchCode ? (FIGI_EXCH_TO_STOOQ[best.exchCode] ?? null) : null;
  const stooqTicker = stooqSuffix ? `${best.ticker.toLowerCase()}${stooqSuffix}` : null;

  // Detect asset type from OpenFIGI securityType
  const st = (best.securityType ?? best.securityType2 ?? "").toLowerCase();
  const assetType: ISINLookupResult["assetType"] =
    st.includes("etp") || st.includes("etf") || st.includes("mutual fund") || st.includes("fund") ? "etf"
    : st.includes("common stock") || st.includes("equity") ? "aandeel"
    : "onbekend";

  return { stooqTicker, ticker: best.ticker, exchange: best.exchCode ?? null, source: "openfigi", assetType };
}

// ---- Step 2: Yahoo Finance search by ISIN ----
async function lookupYahooByISIN(isin: string): Promise<ISINLookupResult | null> {
  return lookupYahooSearch(isin);
}

// ---- Step 4: Yahoo Finance search by name ----
async function lookupYahooByName(naam: string): Promise<ISINLookupResult | null> {
  return lookupYahooSearch(naam);
}

async function lookupYahooSearch(q: string): Promise<ISINLookupResult | null> {
  type YFSearch = { quotes?: { symbol?: string; quoteType?: string }[] };
  const data = await fetchJson<YFSearch>(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&quotesCount=8`
  );

  // Accept EQUITY and ETF quote types
  const quotes = (data?.quotes ?? []).filter(
    (q) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "MUTUALFUND")
  );
  if (quotes.length === 0) return null;

  const symbol = quotes[0].symbol!;
  const stooqTicker = yahooSymbolToStooq(symbol);

  return { stooqTicker, ticker: symbol, exchange: null, source: "yahoo" };
}

// ---- Step 3: Try ISIN directly on Stooq ----
async function lookupStooqDirect(isin: string): Promise<ISINLookupResult | null> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(isin.toLowerCase())}&f=c`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);

  if (!res?.ok) return null;
  const text = (await res.text()).trim();
  if (!text || text === "N/D" || isNaN(parseFloat(text))) return null;

  return { stooqTicker: isin.toLowerCase(), ticker: isin, exchange: null, source: "stooq-direct" };
}

// ---- Verify a Stooq ticker actually returns a price ----
async function verifyStooq(stooqTicker: string): Promise<boolean> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqTicker)}&f=c`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const text = (await res.text()).trim();
    const price = parseFloat(text);
    return !isNaN(price) && price > 0;
  } catch {
    return false;
  }
}

// ---- Main resolver ----
async function resolveISIN(isin: string, naam: string): Promise<ISINLookupResult> {
  // Step 1: OpenFIGI → verify resulting Stooq ticker actually has data
  const figi = await lookupOpenFIGI(isin);
  if (figi?.stooqTicker) {
    const ok = await verifyStooq(figi.stooqTicker);
    if (ok) return figi;
    // Stooq doesn't have this ticker → try other steps
  }

  // Step 2: Yahoo Finance search by ISIN → convert to Stooq ticker
  const yf = await lookupYahooByISIN(isin);
  if (yf?.stooqTicker) {
    const ok = await verifyStooq(yf.stooqTicker);
    if (ok) return yf;
  }

  // Step 3: Try ISIN directly on Stooq
  const stooq = await lookupStooqDirect(isin);
  if (stooq) return stooq;

  // Step 4: Yahoo Finance search by name → convert to Stooq ticker
  if (naam) {
    const yfName = await lookupYahooByName(naam);
    if (yfName?.stooqTicker) {
      const ok = await verifyStooq(yfName.stooqTicker);
      if (ok) return { ...yfName, source: "naam" };
    }
  }

  // If OpenFIGI found a ticker but Stooq didn't verify, still return it
  // (user can see it and the ticker might work on Stooq with a slight delay)
  if (figi?.stooqTicker) return { ...figi, source: "openfigi" };
  if (yf?.stooqTicker) return { ...yf, source: "yahoo" };

  return { stooqTicker: null, ticker: null, exchange: null, source: "onbekend" };
}

// POST /api/isin-lookup
// Body: [{ isin: string, naam: string }]
// Response: { [isin]: ISINLookupResult }
export async function POST(request: NextRequest) {
  let body: { isin: string; naam: string }[];
  try {
    body = await request.json() as { isin: string; naam: string }[];
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({});
  }

  // Resolve all in parallel (max 10 at a time to be gentle to APIs)
  const BATCH = 5;
  const results: Record<string, ISINLookupResult> = {};

  for (let i = 0; i < body.length; i += BATCH) {
    const batch = body.slice(i, i + BATCH);
    const resolved = await Promise.all(
      batch.map(async ({ isin, naam }) => {
        const result = await resolveISIN(isin, naam);
        return [isin, result] as const;
      })
    );
    for (const [isin, result] of resolved) {
      results[isin] = result;
    }
  }

  return NextResponse.json(results);
}
