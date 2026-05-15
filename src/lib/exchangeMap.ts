/**
 * Maps DEGIRO "Beurs" codes to Yahoo Finance ticker suffixes (for CSV parsing context)
 * and to Stooq exchange suffixes (for price fetching).
 */

export interface ExchangeInfo {
  stooqSuffix: string;   // Stooq price data suffix (e.g. ".nl")
  currency: string;       // Expected currency for this exchange
}

export const DEGIRO_TO_EXCHANGE: Record<string, ExchangeInfo> = {
  // Amsterdam / Euronext Netherlands
  EAM:   { stooqSuffix: ".nl", currency: "EUR" },
  TDG:   { stooqSuffix: ".nl", currency: "EUR" },
  XAMS:  { stooqSuffix: ".nl", currency: "EUR" },
  AEX:   { stooqSuffix: ".nl", currency: "EUR" },

  // XETRA / Frankfurt
  XETRA: { stooqSuffix: ".de", currency: "EUR" },
  XET:   { stooqSuffix: ".de", currency: "EUR" },
  XFRA:  { stooqSuffix: ".de", currency: "EUR" },

  // London
  LSE:   { stooqSuffix: ".uk", currency: "GBP" },
  XLON:  { stooqSuffix: ".uk", currency: "GBP" },

  // Euronext Paris
  EPA:   { stooqSuffix: ".fr", currency: "EUR" },
  XPAR:  { stooqSuffix: ".fr", currency: "EUR" },

  // Milan / Borsa Italiana
  BIT:   { stooqSuffix: ".it", currency: "EUR" },
  XMIL:  { stooqSuffix: ".it", currency: "EUR" },

  // Madrid
  BME:   { stooqSuffix: ".es", currency: "EUR" },
  XMAD:  { stooqSuffix: ".es", currency: "EUR" },

  // Swiss Exchange
  SIX:   { stooqSuffix: ".ch", currency: "CHF" },
  XSWX:  { stooqSuffix: ".ch", currency: "CHF" },

  // Stockholm
  STO:   { stooqSuffix: ".sw", currency: "SEK" },
  STK:   { stooqSuffix: ".sw", currency: "SEK" },
  XSTO:  { stooqSuffix: ".sw", currency: "SEK" },

  // Copenhagen
  CPH:   { stooqSuffix: ".dk", currency: "DKK" },
  XCSE:  { stooqSuffix: ".dk", currency: "DKK" },

  // Helsinki
  HEL:   { stooqSuffix: ".fi", currency: "EUR" },
  XHEL:  { stooqSuffix: ".fi", currency: "EUR" },

  // Oslo
  OSE:   { stooqSuffix: ".no", currency: "NOK" },
  XOSL:  { stooqSuffix: ".no", currency: "NOK" },

  // Brussels
  EBR:   { stooqSuffix: ".be", currency: "EUR" },
  XBRU:  { stooqSuffix: ".be", currency: "EUR" },

  // Lisbon
  ELI:   { stooqSuffix: ".pt", currency: "EUR" },
  XLIS:  { stooqSuffix: ".pt", currency: "EUR" },

  // US exchanges
  NYSE:  { stooqSuffix: ".us", currency: "USD" },
  NASDAQ:{ stooqSuffix: ".us", currency: "USD" },
  NSQ:   { stooqSuffix: ".us", currency: "USD" },
  NDQ:   { stooqSuffix: ".us", currency: "USD" },
  ARCA:  { stooqSuffix: ".us", currency: "USD" },
  CBOE:  { stooqSuffix: ".us", currency: "USD" },
  BATS:  { stooqSuffix: ".us", currency: "USD" },
  XNYS:  { stooqSuffix: ".us", currency: "USD" },
  XNAS:  { stooqSuffix: ".us", currency: "USD" },

  // Toronto
  TSX:   { stooqSuffix: ".ca", currency: "CAD" },
  XTSE:  { stooqSuffix: ".ca", currency: "CAD" },

  // Australia
  ASX:   { stooqSuffix: ".au", currency: "AUD" },
  XASX:  { stooqSuffix: ".au", currency: "AUD" },

  // Hong Kong
  HKG:   { stooqSuffix: ".hk", currency: "HKD" },
  XHKG:  { stooqSuffix: ".hk", currency: "HKD" },

  // Japan
  TYO:   { stooqSuffix: ".jp", currency: "JPY" },
  XTOK:  { stooqSuffix: ".jp", currency: "JPY" },
};

/**
 * Build a Stooq ticker from a DEGIRO ticker symbol and exchange code.
 * Stooq tickers are lowercase: {ticker}{exchange_suffix}
 * Example: "ASML" + "EAM" → "asml.nl"
 */
export function buildStooqTicker(ticker: string, exchange: string): string {
  const info = DEGIRO_TO_EXCHANGE[exchange.toUpperCase()];
  if (!info) return ticker.toLowerCase(); // unknown exchange, try without suffix
  return `${ticker.toLowerCase()}${info.stooqSuffix}`;
}

/** Returns expected currency for a given DEGIRO exchange code */
export function getExchangeCurrency(exchange: string): string {
  return DEGIRO_TO_EXCHANGE[exchange.toUpperCase()]?.currency ?? "EUR";
}

export function isISIN(s: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{10}$/.test(s);
}
