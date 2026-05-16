/**
 * Persistent store voor handmatig ingevoerde aankoopprijzen.
 * Overleeft een CSV-herimport: als de nieuwe CSV geen aankoopprijs bevat,
 * wordt de handmatig ingevoerde waarde behouden.
 *
 * Sleutel: ISIN (voorkeur) of Stooq-ticker als fallback.
 * Waarde: aankoopprijs per stuk in lokale valuta van de positie.
 */

const KEY = (userId: string | null | undefined) =>
  userId ? `portfolionl_${userId}_aankoopkoers` : null;

type Store = Record<string, number>; // { [isin|ticker]: prijs }

function load(userId: string | null | undefined): Store {
  const k = KEY(userId);
  if (!k) return {};
  try { return JSON.parse(localStorage.getItem(k) ?? "{}") as Store; }
  catch { return {}; }
}

function persist(userId: string | null | undefined, store: Store) {
  const k = KEY(userId);
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify(store)); } catch {}
}

/** Sla een handmatig ingevoerde aankoopprijs op. */
export function saveAankoopkoers(
  userId: string | null | undefined,
  key: string,   // ISIN (voorkeur) of ticker
  prijs: number,
) {
  const store = load(userId);
  store[key.toUpperCase()] = prijs;
  persist(userId, store);
}

/** Haal opgeslagen aankoopprijs op, of null als niet gevonden. */
export function getAankoopkoers(
  userId: string | null | undefined,
  isin: string,
  ticker: string,
): number | null {
  const store = load(userId);
  if (isin && store[isin.toUpperCase()] != null) return store[isin.toUpperCase()];
  if (ticker && store[ticker.toUpperCase()] != null) return store[ticker.toUpperCase()];
  return null;
}

/** Verwijder een opgeslagen aankoopprijs. */
export function deleteAankoopkoers(userId: string | null | undefined, key: string) {
  const store = load(userId);
  delete store[key.toUpperCase()];
  persist(userId, store);
}

/** Alle opgeslagen aankoopprijzen als { isinOfTicker → prijs } map. */
export function getAllAankoopkoersen(userId: string | null | undefined): Store {
  return load(userId);
}

/**
 * Past opgeslagen aankoopprijzen toe op een lijst van posities.
 * Wordt aangeroepen na CSV-import: alleen invullen als CSV geen prijs had.
 */
export function applyStoredAankoopkoersen<T extends {
  aankoopkoers: number | null;
  isin: string;
  ticker: string;
}>(userId: string | null | undefined, posities: T[]): T[] {
  return posities.map((p) => {
    if (p.aankoopkoers != null && p.aankoopkoers > 0) return p; // CSV had prijs — bewaren
    const opgeslagen = getAankoopkoers(userId, p.isin, p.ticker);
    if (opgeslagen == null) return p;
    return { ...p, aankoopkoers: opgeslagen };
  });
}
