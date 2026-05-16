/**
 * Broker-agnostische CSV parser.
 * Detecteert automatisch welke broker op basis van kolomnamen,
 * en converteert naar een intern standaard ImportedPosition formaat.
 */

import { BrokerNaam, ImportedPosition, AssetCategorie } from "./types";
import { buildStooqTicker, isISIN } from "./exchangeMap";

// ─── Hulpfuncties ─────────────────────────────────────────────────────────────

function detectSep(line: string): string {
  return (line.match(/;/g) ?? []).length > (line.match(/,/g) ?? []).length ? ";" : ",";
}

function parseDutchNum(s: string): number {
  if (!s) return 0;
  const c = s.replace(/[€$£\s"]/g, "").trim();
  if (!c || c === "-" || c === "N/A") return 0;
  if (c.includes(",") && c.includes(".")) {
    return c.lastIndexOf(",") > c.lastIndexOf(".")
      ? parseFloat(c.replace(/\./g, "").replace(",", "."))
      : parseFloat(c.replace(/,/g, ""));
  }
  return parseFloat(c.replace(",", ".")) || 0;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === sep && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findCol(headers: string[], ...aliases: string[]): number {
  for (const a of aliases) {
    const i = headers.findIndex((h) => norm(h) === norm(a));
    if (i !== -1) return i;
  }
  return -1;
}

function parseLines(raw: string): { sep: string; headers: string[]; rows: string[][] } {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { sep: ",", headers: [], rows: [] };
  const sep = detectSep(lines[0]);
  const headers = parseCSVLine(lines[0], sep);
  const rows = lines.slice(1).map((l) => parseCSVLine(l, sep));
  return { sep, headers, rows };
}

// ─── Broker detectie ──────────────────────────────────────────────────────────

export function detectBroker(headers: string[]): BrokerNaam {
  const n = headers.map(norm);
  const has = (...keys: string[]) => keys.every((k) => n.some((h) => h.includes(norm(k))));

  if (has("symboolisin") || (has("beurs") && has("aantal"))) return "DEGIRO";
  if (has("averageprice") && has("shares") && has("currentprice")) return "Trading 212";
  if (has("openrate") || has("currentrate") || has("netprofit")) return "eToro";
  if (has("avgcost") && has("description") && has("quantity")) return "Saxo Bank";
  if (n.some((h) => h.includes("stck") || h === "stcknominal" || h === "stcknominal")) return "Flatex";
  if (has("averagebuyprice") && !has("openrate")) return "Revolut";
  if (has("mult") && has("costprice") && has("closeprice")) return "Interactive Brokers";
  if (has("aankoopprijs") && has("huidigewaarde")) return "Bitvavo";
  if (has("coin") && (has("usdvalue") || has("amount"))) return "Binance";

  return "Overig";
}

// ─── Per-broker parsers ───────────────────────────────────────────────────────

function parseDEGIRO(headers: string[], rows: string[][]): ImportedPosition[] {
  const cNaam  = findCol(headers, "Product", "Naam");
  const cSym   = findCol(headers, "Symbool/ISIN", "Symbol/ISIN");
  const cExch  = findCol(headers, "Beurs");
  const cCur   = findCol(headers, "Valuta");
  const cAant  = findCol(headers, "Aantal");
  const cKoers = findCol(headers, "Slotkoers", "Closing price");
  const cWEUR  = findCol(headers, "Waarde in EUR (€)", "Value in EUR (€)");
  const cGemAk = findCol(headers, "Gemiddelde aankoopprijs", "Average purchase price");

  return rows.flatMap((cols): ImportedPosition[] => {
    const rawSym = cols[cSym]?.replace(/"/g, "").trim() ?? "";
    const naam   = cols[cNaam]?.replace(/"/g, "").trim() || rawSym;
    const exchange = cols[cExch]?.replace(/"/g, "").trim() ?? "";
    const currency = cols[cCur]?.replace(/"/g, "").trim() ?? "EUR";
    const aantal   = parseDutchNum(cols[cAant] ?? "");
    if (!rawSym || aantal <= 0) return [];

    const isin   = isISIN(rawSym) ? rawSym : "";
    const rawTk  = isISIN(rawSym) ? "" : rawSym;
    const ticker = rawTk ? buildStooqTicker(rawTk, exchange) : rawSym;

    return [{
      ticker,
      naam,
      isin,
      aantal,
      aankoopprijs: cGemAk !== -1 ? parseDutchNum(cols[cGemAk] ?? "") || null : null,
      huidigeKoers: cKoers !== -1 ? parseDutchNum(cols[cKoers] ?? "") || null : null,
      waarde: cWEUR !== -1 ? parseDutchNum(cols[cWEUR] ?? "") || null : null,
      valuta: currency,
      broker: "DEGIRO",
      assetCategorie: "onbekend",
    }];
  });
}

function parseTrading212(headers: string[], rows: string[][]): ImportedPosition[] {
  const cTicker  = findCol(headers, "Ticker");
  const cName    = findCol(headers, "Name");
  const cShares  = findCol(headers, "Shares");
  const cAvgP    = findCol(headers, "Average price");
  const cCurP    = findCol(headers, "Current price");
  const cTotal   = findCol(headers, "Total");
  const cCur     = findCol(headers, "Currency");

  return rows.flatMap((cols): ImportedPosition[] => {
    const ticker = cols[cTicker]?.trim() ?? "";
    const aantal = parseDutchNum(cols[cShares] ?? "");
    if (!ticker || aantal <= 0) return [];
    const currency = cols[cCur]?.trim() || "EUR";
    const stooq = ticker.includes(".") ? ticker.toLowerCase() : `${ticker.toLowerCase()}.us`;
    return [{
      ticker: stooq,
      naam: cols[cName]?.trim() || ticker,
      isin: "",
      aantal,
      aankoopprijs: cAvgP !== -1 ? parseDutchNum(cols[cAvgP] ?? "") || null : null,
      huidigeKoers: cCurP !== -1 ? parseDutchNum(cols[cCurP] ?? "") || null : null,
      waarde: cTotal !== -1 ? parseDutchNum(cols[cTotal] ?? "") || null : null,
      valuta: currency,
      broker: "Trading 212",
      assetCategorie: "onbekend",
    }];
  });
}

function parseEToro(headers: string[], rows: string[][]): ImportedPosition[] {
  const cSym  = findCol(headers, "Symbol", "Ticker");
  const cUni  = findCol(headers, "Units");
  const cOpen = findCol(headers, "Open Rate");
  const cCur  = findCol(headers, "Current Rate");
  const cProfit = findCol(headers, "Net Profit");

  return rows.flatMap((cols): ImportedPosition[] => {
    const sym   = cols[cSym]?.trim() ?? "";
    const units = parseDutchNum(cols[cUni] ?? "");
    if (!sym || units <= 0) return [];
    const openRate = cOpen !== -1 ? parseDutchNum(cols[cOpen] ?? "") || null : null;
    const curRate  = cCur  !== -1 ? parseDutchNum(cols[cCur]  ?? "") || null : null;
    const profit   = cProfit !== -1 ? parseDutchNum(cols[cProfit] ?? "") : 0;
    const waarde   = curRate && units ? curRate * units + profit : null;
    return [{
      ticker: `${sym.toLowerCase()}.us`,
      naam: sym,
      isin: "",
      aantal: units,
      aankoopprijs: openRate,
      huidigeKoers: curRate,
      waarde,
      valuta: "USD",
      broker: "eToro",
      assetCategorie: "onbekend",
    }];
  });
}

function parseSaxo(headers: string[], rows: string[][]): ImportedPosition[] {
  const cSym  = findCol(headers, "Symbol");
  const cDesc = findCol(headers, "Description");
  const cQty  = findCol(headers, "Quantity");
  const cAvg  = findCol(headers, "Avg. Cost", "AvgCost");
  const cCur  = findCol(headers, "Current Price");
  const cCurrency = findCol(headers, "Currency");

  return rows.flatMap((cols): ImportedPosition[] => {
    const sym  = cols[cSym]?.trim() ?? "";
    const qty  = parseDutchNum(cols[cQty] ?? "");
    if (!sym || qty <= 0) return [];
    const currency = cols[cCurrency]?.trim() || "EUR";
    const cur = cCur !== -1 ? parseDutchNum(cols[cCur] ?? "") || null : null;
    const avg = cAvg !== -1 ? parseDutchNum(cols[cAvg] ?? "") || null : null;
    return [{
      ticker: `${sym.toLowerCase()}.us`,
      naam: cols[cDesc]?.trim() || sym,
      isin: "",
      aantal: qty,
      aankoopprijs: avg,
      huidigeKoers: cur,
      waarde: cur ? cur * qty : null,
      valuta: currency,
      broker: "Saxo Bank",
      assetCategorie: "onbekend",
    }];
  });
}

function parseFlatex(headers: string[], rows: string[][]): ImportedPosition[] {
  const cISIN = findCol(headers, "ISIN");
  const cName = findCol(headers, "Name", "Bezeichnung", "Wertpapierbezeichnung");
  const cQty  = findCol(headers, "Stück", "Stück/Nominal", "Nominal");
  const cKurs = findCol(headers, "Kurs", "Aktueller Kurs");
  const cWert = findCol(headers, "Wert", "Aktueller Wert");

  return rows.flatMap((cols): ImportedPosition[] => {
    const isin = cols[cISIN]?.trim() ?? "";
    const qty  = parseDutchNum(cols[cQty] ?? "");
    if (!isin || qty <= 0) return [];
    return [{
      ticker: isin,   // ISIN lookup later
      naam: cols[cName]?.trim() || isin,
      isin,
      aantal: qty,
      aankoopprijs: null,
      huidigeKoers: cKurs !== -1 ? parseDutchNum(cols[cKurs] ?? "") || null : null,
      waarde: cWert !== -1 ? parseDutchNum(cols[cWert] ?? "") || null : null,
      valuta: "EUR",
      broker: "Flatex",
      assetCategorie: "onbekend",
    }];
  });
}

function parseRevolut(headers: string[], rows: string[][]): ImportedPosition[] {
  const cSym  = findCol(headers, "Symbol", "Ticker");
  const cQty  = findCol(headers, "Quantity");
  const cAvg  = findCol(headers, "Average Buy Price");
  const cCur  = findCol(headers, "Current Price");
  const cCurrency = findCol(headers, "Currency");

  return rows.flatMap((cols): ImportedPosition[] => {
    const sym = cols[cSym]?.trim() ?? "";
    const qty = parseDutchNum(cols[cQty] ?? "");
    if (!sym || qty <= 0) return [];
    const currency = cols[cCurrency]?.trim() || "USD";
    const cur = cCur !== -1 ? parseDutchNum(cols[cCur] ?? "") || null : null;
    const avg = cAvg !== -1 ? parseDutchNum(cols[cAvg] ?? "") || null : null;
    return [{
      ticker: `${sym.toLowerCase()}.us`,
      naam: sym,
      isin: "",
      aantal: qty,
      aankoopprijs: avg,
      huidigeKoers: cur,
      waarde: cur ? cur * qty : null,
      valuta: currency,
      broker: "Revolut",
      assetCategorie: "onbekend",
    }];
  });
}

function parseIBKR(headers: string[], rows: string[][]): ImportedPosition[] {
  const cSym   = findCol(headers, "Symbol");
  const cQty   = findCol(headers, "Quantity");
  const cCost  = findCol(headers, "Cost Price", "Average Cost");
  const cClose = findCol(headers, "Close Price", "Current Price");
  const cCur   = findCol(headers, "Currency");

  return rows.flatMap((cols): ImportedPosition[] => {
    const sym = cols[cSym]?.trim() ?? "";
    const qty = parseDutchNum(cols[cQty] ?? "");
    if (!sym || qty <= 0) return [];
    const currency = cols[cCur]?.trim() || "USD";
    const close = cClose !== -1 ? parseDutchNum(cols[cClose] ?? "") || null : null;
    const cost  = cCost  !== -1 ? parseDutchNum(cols[cCost]  ?? "") || null : null;
    return [{
      ticker: `${sym.toLowerCase()}.us`,
      naam: sym,
      isin: "",
      aantal: qty,
      aankoopprijs: cost,
      huidigeKoers: close,
      waarde: close ? close * qty : null,
      valuta: currency,
      broker: "Interactive Brokers",
      assetCategorie: "onbekend",
    }];
  });
}

function parseBitvavo(headers: string[], rows: string[][]): ImportedPosition[] {
  const cNaam  = findCol(headers, "Naam", "Name", "Coin");
  const cAant  = findCol(headers, "Aantal", "Amount");
  const cAkP   = findCol(headers, "Aankoopprijs", "Average Buy Price");
  const cWaard = findCol(headers, "Huidige waarde", "Current value");

  return rows.flatMap((cols): ImportedPosition[] => {
    const naam  = cols[cNaam]?.trim() ?? "";
    const aant  = parseDutchNum(cols[cAant] ?? "");
    if (!naam || aant <= 0) return [];
    return [{
      ticker: naam.toLowerCase().replace(/\s+/g, "-"),
      naam,
      isin: "",
      aantal: aant,
      aankoopprijs: cAkP !== -1 ? parseDutchNum(cols[cAkP] ?? "") || null : null,
      huidigeKoers: null,
      waarde: cWaard !== -1 ? parseDutchNum(cols[cWaard] ?? "") || null : null,
      valuta: "EUR",
      broker: "Bitvavo",
      assetCategorie: "crypto",
    }];
  });
}

function parseBinance(headers: string[], rows: string[][]): ImportedPosition[] {
  const cCoin   = findCol(headers, "Coin");
  const cAmount = findCol(headers, "Amount");
  const cUSD    = findCol(headers, "USD Value");

  return rows.flatMap((cols): ImportedPosition[] => {
    const coin   = cols[cCoin]?.trim() ?? "";
    const amount = parseDutchNum(cols[cAmount] ?? "");
    if (!coin || amount <= 0) return [];
    return [{
      ticker: coin.toLowerCase(),
      naam: coin,
      isin: "",
      aantal: amount,
      aankoopprijs: null,
      huidigeKoers: null,
      waarde: cUSD !== -1 ? parseDutchNum(cols[cUSD] ?? "") || null : null,
      valuta: "USD",
      broker: "Binance",
      assetCategorie: "crypto",
    }];
  });
}

// ─── Publieke API ──────────────────────────────────────────────────────────────

export interface ParseResult {
  broker: BrokerNaam;
  positions: ImportedPosition[];
  errors: string[];
}

export function parseBrokerCSV(raw: string): ParseResult {
  const { headers, rows } = parseLines(raw);

  if (headers.length === 0) {
    return { broker: "Overig", positions: [], errors: ["Geen geldige CSV gevonden."] };
  }

  const broker = detectBroker(headers);
  let positions: ImportedPosition[] = [];

  try {
    switch (broker) {
      case "DEGIRO":              positions = parseDEGIRO(headers, rows); break;
      case "Trading 212":         positions = parseTrading212(headers, rows); break;
      case "eToro":               positions = parseEToro(headers, rows); break;
      case "Saxo Bank":           positions = parseSaxo(headers, rows); break;
      case "Flatex":              positions = parseFlatex(headers, rows); break;
      case "Revolut":             positions = parseRevolut(headers, rows); break;
      case "Interactive Brokers": positions = parseIBKR(headers, rows); break;
      case "Bitvavo":             positions = parseBitvavo(headers, rows); break;
      case "Binance":             positions = parseBinance(headers, rows); break;
      default:
        return {
          broker: "Overig",
          positions: [],
          errors: ["Broker niet herkend. Controleer of dit een ondersteund CSV-formaat is."],
        };
    }
  } catch (e) {
    return { broker, positions: [], errors: [(e as Error).message] };
  }

  const valid = positions.filter((p) => p.aantal > 0);
  return { broker, positions: valid, errors: [] };
}

// Categorie bepalen o.b.v. broker + asset info
export function inferCategorie(p: ImportedPosition): AssetCategorie {
  if (p.assetCategorie !== "onbekend") return p.assetCategorie;
  if (p.broker === "Bitvavo" || p.broker === "Binance") return "crypto";
  return "onbekend";
}
