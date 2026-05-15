import { StockPosition, DividendRecord, AssetType } from "./types";
import { buildStooqTicker, isISIN } from "./exchangeMap";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function detectSeparator(line: string): string {
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseDutchNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[€\s"]/g, "").trim();
  if (!cleaned || cleaned === "N/A" || cleaned === "-") return 0;
  // Dutch: "1.234,56" → 1234.56 | international: "1,234.56" → 1234.56
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    return lastComma > lastDot
      ? parseFloat(cleaned.replace(/\./g, "").replace(",", "."))
      : parseFloat(cleaned.replace(/,/g, ""));
  }
  if (cleaned.includes(",")) return parseFloat(cleaned.replace(",", "."));
  return parseFloat(cleaned) || 0;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === sep && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Portfolio CSV (Portefeuille.csv) from DEGIRO
// ---------------------------------------------------------------------------

// Keywords that indicate an ETF (case-insensitive match in product name)
const ETF_KEYWORDS = [
  "etf", "index", "ucits", " acc", " dist", " fund",
  "ishares", "vanguard", "xtrackers", "amundi", "spdr", "lyxor",
  "bnp", "invesco", "dws", "dimensional", "robeco", "pimco",
];

function detectAssetType(naam: string): AssetType {
  const lower = naam.toLowerCase();
  if (ETF_KEYWORDS.some((kw) => lower.includes(kw))) return "etf";
  return "onbekend"; // default — OpenFIGI may override later
}

const COLUMN_ALIASES: Record<string, string[]> = {
  naam:        ["product", "naam", "name", "omschrijving"],
  symbol:      ["symboolisin", "symbolisin", "ticker", "symbol"],
  exchange:    ["beurs", "exchange", "markt", "market"],
  currency:    ["valuta", "currency"],
  quantity:    ["aantal", "quantity", "hoeveelheid", "shares"],
  slotkoers:   ["slotkoers", "closingprice", "closeprice", "koers", "price", "lastprice"],
  waardeeur:   ["waardeineure", "valueineure", "totaleure", "eure", "eurvalue"],
  aankoopkoers: ["gemiddeldaankoopprijs", "aankoopprijs", "purchaseprice", "avgcost", "gemiddeld"],
};

function findColumn(headers: string[], key: string): number {
  const aliases = COLUMN_ALIASES[key] ?? [key];
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => normalizeHeader(h) === alias);
    if (idx !== -1) return idx;
  }
  // Broader fuzzy fallback for the "waarde in eur" column (DEGIRO varies this header)
  if (key === "waardeeur") {
    const idx = headers.findIndex((h) => {
      const n = normalizeHeader(h);
      return n.includes("eur") && (n.includes("waarde") || n.includes("value") || n.includes("total"));
    });
    return idx;
  }
  return -1;
}

export function parsePortfolioCSV(raw: string): StockPosition[] {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep);

  const colNaam        = findColumn(headers, "naam");
  const colSymbol      = findColumn(headers, "symbol");
  const colExchange    = findColumn(headers, "exchange");
  const colCurrency    = findColumn(headers, "currency");
  const colQuantity    = findColumn(headers, "quantity");
  const colSlotkoers   = findColumn(headers, "slotkoers");
  const colWaardeEur   = findColumn(headers, "waardeeur");
  const colAankoopkoers = findColumn(headers, "aankoopkoers");

  if (colQuantity === -1 || colSymbol === -1) {
    throw new Error(
      "Kan kolommen 'Aantal' en 'Symbool/ISIN' niet vinden. Controleer of dit een DEGIRO portefeuille-export is."
    );
  }

  const positions: StockPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    if (cols.length < 3) continue;

    const rawSymbol    = cols[colSymbol]?.replace(/"/g, "").trim() ?? "";
    const naam         = cols[colNaam]?.replace(/"/g, "").trim() || rawSymbol;
    const exchange     = cols[colExchange]?.replace(/"/g, "").trim() ?? "";
    const currency     = cols[colCurrency]?.replace(/"/g, "").trim() ?? "EUR";
    const quantity     = parseDutchNumber(cols[colQuantity] ?? "");
    const slotkoers     = colSlotkoers !== -1 ? parseDutchNumber(cols[colSlotkoers] ?? "") : null;
    const waardeEur     = colWaardeEur !== -1 ? parseDutchNumber(cols[colWaardeEur] ?? "") : null;
    const aankoopkoers  = colAankoopkoers !== -1 ? parseDutchNumber(cols[colAankoopkoers] ?? "") : null;

    if (!rawSymbol || quantity <= 0) continue;

    const symbolIsISIN = isISIN(rawSymbol);
    const isin         = symbolIsISIN ? rawSymbol : "";
    const rawTicker    = symbolIsISIN ? "" : rawSymbol;

    let stooqTicker: string;
    let tickerBron: StockPosition["tickerBron"];
    let warning: string | undefined;

    if (rawTicker) {
      // Ticker known from CSV → build Stooq ticker immediately
      stooqTicker = buildStooqTicker(rawTicker, exchange);
      tickerBron = "csv";
    } else if (isin) {
      // ISIN only → needs resolution, use ISIN as placeholder
      stooqTicker = isin;
      tickerBron = "pending";
      // No warning yet — will be set during resolution if it fails
    } else {
      stooqTicker = naam.toLowerCase().replace(/\s+/g, "");
      tickerBron = "onbekend";
      warning = "Geen ticker of ISIN gevonden in CSV.";
    }

    positions.push({
      id: uuidv4(),
      naam,
      ticker: stooqTicker,
      isin,
      aantalAandelen: quantity,
      exchange,
      currency,
      huidigeKoers: null,
      huidigeKoersValuta: "EUR",
      marktwaarde: null,
      degiroKoers: slotkoers && slotkoers > 0 ? slotkoers : null,
      degiroWaardeEur: waardeEur && waardeEur > 0 ? waardeEur : null,
      tickerBron,
      assetType: detectAssetType(naam),
      aankoopkoers: aankoopkoers && aankoopkoers > 0 ? aankoopkoers : null,
      aankoopdatum: null,
      stoploss: null,
      warning,
    });
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Account statement CSV (Rekening.csv) — extracts dividend payments
// ---------------------------------------------------------------------------

export function parseDividendCSV(raw: string): DividendRecord[] {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map(normalizeHeader);

  const colDate    = headers.findIndex((h) => h === "datum" || h === "date");
  const colProduct = headers.findIndex((h) => h === "product" || h === "naam");
  const colISIN    = headers.findIndex((h) => h === "isin");
  const colDesc    = headers.findIndex((h) => h.includes("omschrijving") || h.includes("description"));
  const colAmount  = headers.findIndex((h) => h.includes("mutatie") || h.includes("amount"));
  const colCur     = headers.findIndex((h) => h === "valuta" || h.includes("fx"));

  const records: DividendRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    const desc  = cols[colDesc]?.toLowerCase() ?? "";
    if (!desc.includes("dividend")) continue;

    const bedrag = Math.abs(parseDutchNumber(cols[colAmount] ?? "0"));
    if (bedrag === 0) continue;

    records.push({
      id: uuidv4(),
      naam: cols[colProduct]?.replace(/"/g, "").trim() ?? "Onbekend",
      isin: cols[colISIN]?.replace(/"/g, "").trim() ?? "",
      datum: cols[colDate]?.replace(/"/g, "").trim() ?? "",
      brutoBedrag: bedrag,
      dividendbelasting: 0,
      nettoBedrag: bedrag,
      valuta: cols[colCur]?.replace(/"/g, "").trim() ?? "EUR",
    });
  }

  return records;
}
