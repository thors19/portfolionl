import { NextRequest, NextResponse } from "next/server";

const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_HEADERS = {
  Accept: "application/json",
  "User-Agent": "portfolionl/1.0",
};

const priceCache = new Map<string, { data: unknown; expires: number }>();

// GET /api/crypto?action=search&q=bitcoin
// GET /api/crypto?action=price&ids=bitcoin,ethereum
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "search") {
    const q = searchParams.get("q") ?? "";
    if (!q) return NextResponse.json({ results: [] });

    try {
      const res = await fetch(`${CG_BASE}/search?query=${encodeURIComponent(q)}`, {
        headers: CG_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { coins?: { id: string; name: string; symbol: string; thumb: string }[] };
      const coins = (json.coins ?? []).slice(0, 8).map((c) => ({
        id: c.id,
        naam: c.name,
        symbol: c.symbol.toUpperCase(),
        thumb: c.thumb,
      }));
      return NextResponse.json({ results: coins });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message, results: [] }, { status: 502 });
    }
  }

  if (action === "price") {
    const ids = searchParams.get("ids") ?? "";
    if (!ids) return NextResponse.json({});

    const cacheKey = `price:${ids}`;
    const now = Date.now();
    const cached = priceCache.get(cacheKey);
    if (cached && cached.expires > now) {
      return NextResponse.json(cached.data);
    }

    try {
      const res = await fetch(
        `${CG_BASE}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=eur`,
        { headers: CG_HEADERS, signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as Record<string, { eur: number }>;
      priceCache.set(cacheKey, { data: json, expires: now + 5 * 60 * 1000 });
      return NextResponse.json(json);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
