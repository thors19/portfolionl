export type TickerBron = "csv" | "openfigi" | "yahoo" | "stooq-direct" | "naam" | "pending" | "onbekend";
export type AssetType = "etf" | "aandeel" | "onbekend";
export type MetaalType = "goud" | "zilver" | "platina" | "palladium" | "koper";

export interface StoplossConfig {
  type: "percentage" | "absoluut";
  waarde: number;        // % of EUR absolute
  insteldatum: string;   // ISO date
}

export interface StockPosition {
  id: string;
  naam: string;
  ticker: string;               // Stooq ticker
  isin: string;
  aantalAandelen: number;
  exchange: string;
  currency: string;
  huidigeKoers: number | null;
  huidigeKoersValuta: string;
  marktwaarde: number | null;   // EUR
  degiroKoers: number | null;
  degiroWaardeEur: number | null;
  tickerBron: TickerBron;
  assetType: AssetType;
  aankoopkoers: number | null;   // Per aandeel, in lokale valuta (uit CSV of handmatig)
  aankoopdatum: string | null;   // ISO date voor CAGR
  stoploss: StoplossConfig | null;
  warning?: string;
}

export interface CryptoPosition {
  id: string;
  naam: string;
  coinGeckoId: string;
  aantalCoins: number;
  huidigeKoers: number | null;
  marktwaarde: number | null;
}

export interface MetalPosition {
  id: string;
  type: MetaalType;
  grammen: number;
  prijsPerGram: number | null;   // EUR
  marktwaarde: number | null;    // EUR
}

export interface DividendRecord {
  id: string;
  naam: string;
  isin: string;
  datum: string;
  brutoBedrag: number;
  dividendbelasting: number;
  nettoBedrag: number;
  valuta: string;
}

export interface SimulatorDataPoint {
  jaar: number;
  vermogen: number;
  inleg: number;
  rendement: number;
  dividend: number;
}

export interface ISINLookupResult {
  stooqTicker: string | null;
  ticker: string | null;
  exchange: string | null;
  source: TickerBron;
  assetType?: AssetType;
}

export interface DoelgewichtSettings {
  etf: number;
  aandeel: number;
  crypto: number;
  metalen: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  leestijd: number;
  author: string;
  content?: string;
}
