import { StockPosition, CryptoPosition, MetalPosition } from "./types";

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Formatteert een bedrag in EUR met Nederlandse notatie (punt als duizendtal, komma als decimaal). */
export function fEur(n: number, decimals = 2): string {
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatteert een percentage, altijd met teken. */
export function fPct(n: number, decimals = 2): string {
  const sign = n >= 0 ? "+" : "";
  return sign + n.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + "%";
}

/** Formatteert een absoluut EUR bedrag met teken. */
export function fEurTeken(n: number, decimals = 2): string {
  const sign = n >= 0 ? "+" : "";
  return sign + "€ " + Math.abs(n).toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Rendement per positie ────────────────────────────────────────────────────

export interface PositieRendement {
  geïnvesteerd: number | null;  // aankoopkoers × aantal (in EUR — best effort)
  huidigeWaarde: number | null; // marktwaarde in EUR
  rendementEUR: number | null;
  rendementPct: number | null;
}

export function berekenPositieRendement(s: StockPosition): PositieRendement {
  const huidig = s.marktwaarde ?? (s.degiroWaardeEur ?? null);
  const aankoopEUR = s.aankoopkoers != null
    ? s.aankoopkoers * s.aantalAandelen
    : null;

  if (huidig == null || aankoopEUR == null || aankoopEUR === 0) {
    return { geïnvesteerd: aankoopEUR, huidigeWaarde: huidig, rendementEUR: null, rendementPct: null };
  }

  const rEur = huidig - aankoopEUR;
  const rPct = (rEur / aankoopEUR) * 100;
  return { geïnvesteerd: aankoopEUR, huidigeWaarde: huidig, rendementEUR: rEur, rendementPct: rPct };
}

export function berekenCryptoRendement(c: CryptoPosition): PositieRendement {
  const huidig = c.marktwaarde ?? null;
  const aankoopEUR = c.aankoopkoers != null ? c.aankoopkoers * c.aantalCoins : null;
  if (huidig == null || aankoopEUR == null || aankoopEUR === 0) {
    return { geïnvesteerd: aankoopEUR, huidigeWaarde: huidig, rendementEUR: null, rendementPct: null };
  }
  const rEur = huidig - aankoopEUR;
  return { geïnvesteerd: aankoopEUR, huidigeWaarde: huidig, rendementEUR: rEur, rendementPct: (rEur / aankoopEUR) * 100 };
}

// ─── Portfolio-niveau berekeningen ───────────────────────────────────────────

export interface PortfolioBerekening {
  totaalWaarde: number;
  totaalGeïnvesteerd: number;
  rendementEUR: number;
  rendementPct: number;
  aantalMetAankoopkoers: number;
  aantalZonderAankoopkoers: number;
}

export function berekenPortfolio(
  stocks: StockPosition[],
  crypto: CryptoPosition[],
  metals: MetalPosition[],
): PortfolioBerekening {
  let totaalWaarde = 0;
  let totaalGeïnvesteerd = 0;
  let metAankoopkoers = 0;
  let zonderAankoopkoers = 0;

  for (const s of stocks) {
    const w = s.marktwaarde ?? s.degiroWaardeEur ?? 0;
    totaalWaarde += w;
    if (s.aankoopkoers != null) {
      totaalGeïnvesteerd += s.aankoopkoers * s.aantalAandelen;
      metAankoopkoers++;
    } else {
      zonderAankoopkoers++;
    }
  }

  for (const c of crypto) {
    const w = c.marktwaarde ?? 0;
    totaalWaarde += w;
    if (c.aankoopkoers != null) {
      totaalGeïnvesteerd += c.aankoopkoers * c.aantalCoins;
      metAankoopkoers++;
    } else {
      zonderAankoopkoers++;
    }
  }

  for (const m of metals) {
    totaalWaarde += m.marktwaarde ?? 0;
    // Edelmetalen: we tellen mee in waarde maar hebben geen vaste aankoopkoers hier
  }

  const rendementEUR = totaalGeïnvesteerd > 0 ? totaalWaarde - totaalGeïnvesteerd : 0;
  const rendementPct = totaalGeïnvesteerd > 0 ? (rendementEUR / totaalGeïnvesteerd) * 100 : 0;

  return {
    totaalWaarde,
    totaalGeïnvesteerd,
    rendementEUR,
    rendementPct,
    aantalMetAankoopkoers: metAankoopkoers,
    aantalZonderAankoopkoers: zonderAankoopkoers,
  };
}

// ─── Winnaars & verliezers ────────────────────────────────────────────────────

export interface Performer {
  naam: string;
  ticker: string;
  rendementPct: number;
  rendementEUR: number;
}

export function getWinnaarsVerliezers(stocks: StockPosition[], crypto: CryptoPosition[]): {
  winnaars: Performer[];
  verliezers: Performer[];
} {
  const all: Performer[] = [];

  for (const s of stocks) {
    const r = berekenPositieRendement(s);
    if (r.rendementPct != null && r.rendementEUR != null) {
      all.push({ naam: s.naam, ticker: s.ticker, rendementPct: r.rendementPct, rendementEUR: r.rendementEUR });
    }
  }

  for (const c of crypto) {
    const r = berekenCryptoRendement(c);
    if (r.rendementPct != null && r.rendementEUR != null) {
      all.push({ naam: c.naam, ticker: c.coinGeckoId, rendementPct: r.rendementPct, rendementEUR: r.rendementEUR });
    }
  }

  all.sort((a, b) => b.rendementPct - a.rendementPct);

  return {
    winnaars: all.slice(0, 3),
    verliezers: all.slice(-3).reverse(),
  };
}
