// ─── Broker & Portfolio ───────────────────────────────────────────────────────

export type BrokerNaam =
  | "DEGIRO"
  | "Trading 212"
  | "eToro"
  | "Saxo Bank"
  | "Flatex"
  | "Revolut"
  | "Interactive Brokers"
  | "Bitvavo"
  | "Binance"
  | "Handmatig"
  | "Overig";

export interface Portfolio {
  id: string;
  naam: string;
  kleur: string;          // hex, bijv. "#2563eb"
  broker: BrokerNaam;
  aangemaaktOp: string;   // ISO date
  laatsteImport: string | null;
}

// ─── Posities ─────────────────────────────────────────────────────────────────

export type TickerBron = "csv" | "openfigi" | "yahoo" | "stooq-direct" | "naam" | "pending" | "onbekend";
export type AssetType   = "etf" | "aandeel" | "onbekend";
export type MetaalType  = "goud" | "zilver" | "platina" | "palladium" | "koper";

export type AssetCategorie =
  | "aandeel" | "etf" | "obligatie" | "reit" | "grondstof"
  | "crypto"  | "metaal" | "spaar" | "pensioen" | "onbekend";

export interface StoplossConfig {
  type: "percentage" | "absoluut";
  waarde: number;
  insteldatum: string;
}

export interface StockPosition {
  id: string;
  portfolioId: string;         // welke portefeuille
  broker: BrokerNaam;
  naam: string;
  ticker: string;              // Stooq ticker
  isin: string;
  aantalAandelen: number;
  exchange: string;
  currency: string;
  huidigeKoers: number | null;
  huidigeKoersValuta: string;
  marktwaarde: number | null;  // EUR
  degiroKoers: number | null;
  degiroWaardeEur: number | null;
  tickerBron: TickerBron;
  assetType: AssetType;
  assetCategorie: AssetCategorie;
  aankoopkoers: number | null;
  aankoopdatum: string | null;
  stoploss: StoplossConfig | null;
  // Extra velden voor uitgebreide asset types
  coupon?: number;             // obligaties: jaarlijks coupon %
  looptijdDatum?: string;      // obligaties/spaar: vervaldatum ISO
  rente?: number;              // spaargeld: jaarlijkse rente %
  dividendYield?: number;      // REITs
  warning?: string;
}

export interface CryptoPosition {
  id: string;
  portfolioId: string;
  broker: BrokerNaam;
  naam: string;
  coinGeckoId: string;
  aantalCoins: number;
  huidigeKoers: number | null;
  marktwaarde: number | null;
  aankoopkoers: number | null;
}

export interface MetalPosition {
  id: string;
  portfolioId: string;
  broker: BrokerNaam;
  type: MetaalType;
  grammen: number;
  prijsPerGram: number | null;
  marktwaarde: number | null;
}

export interface DividendRecord {
  id: string;
  portfolioId?: string;
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

// ─── Broker import resultaat ──────────────────────────────────────────────────

export interface ImportedPosition {
  ticker: string;
  naam: string;
  isin: string;
  aantal: number;
  aankoopprijs: number | null;
  huidigeKoers: number | null;
  waarde: number | null;
  valuta: string;
  broker: BrokerNaam;
  assetCategorie: AssetCategorie;
}
