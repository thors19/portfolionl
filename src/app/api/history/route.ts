/**
 * Historical price data from Stooq.com
 * GET /api/history?ticker=asml.nl&period=1y
 * Returns: { data: [{date, close}], benchmarkData: [{date, close}] }
 */

import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (compatible; portfolionl/1.0)";
const histCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for historical data

interface PricePoint { date: string; close: number }

async function fetchStooqHistory(ticker: string): Promise<PricePoint[]> {
  const cacheKey = ticker;
  const hit = histCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as PricePoint[];

  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(ticker)}&i=d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Stooq format: Date,Open,High,Low,Close,Volume
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const data: PricePoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length < 5) continue;
      const dateStr = parts[0].trim();
      const close = parseFloat(parts[4]);
      if (!dateStr || isNaN(close) || close <= 0) continue;
      const date = new Date(dateStr);
      if (date < oneYearAgo) continue;
      data.push({ date: dateStr, close });
    }

    histCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch {
    return [];
  }
}

function normalizeToBase100(data: PricePoint[]): PricePoint[] {
  if (data.length === 0) return [];
  const base = data[0].close;
  return data.map((p) => ({ date: p.date, close: parseFloat(((p.close / base) * 100).toFixed(2)) }));
}

// GET /api/history?ticker=asml.nl&benchmark=vwrl.nl&normalize=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker") ?? "";
  const benchmark = searchParams.get("benchmark") ?? "vwrl.nl";
  const normalize = searchParams.get("normalize") !== "false";

  if (!ticker) return NextResponse.json({ error: "Geen ticker opgegeven" }, { status: 400 });

  const [rawData, rawBenchmark] = await Promise.all([
    fetchStooqHistory(ticker),
    benchmark ? fetchStooqHistory(benchmark) : Promise.resolve([]),
  ]);

  const data = normalize ? normalizeToBase100(rawData) : rawData;
  const benchmarkData = normalize ? normalizeToBase100(rawBenchmark) : rawBenchmark;

  // Calculate period performance
  const performance = rawData.length >= 2
    ? ((rawData[rawData.length - 1].close - rawData[0].close) / rawData[0].close) * 100
    : null;
  const benchmarkPerf = rawBenchmark.length >= 2
    ? ((rawBenchmark[rawBenchmark.length - 1].close - rawBenchmark[0].close) / rawBenchmark[0].close) * 100
    : null;

  return NextResponse.json({ data, benchmarkData, performance, benchmarkPerf });
}
