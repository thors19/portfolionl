export interface Snapshot {
  datum: string;              // YYYY-MM-DD
  totaalWaarde: number;       // EUR
  totaalGeïnvesteerd: number; // EUR (som aankoopkoers × aantal waar bekend)
  rendementEUR: number;
  rendementPct: number;
}

const MAX_SNAPSHOTS = 730; // 2 jaar

function snapshotKey(userId: string | null | undefined): string | null {
  return userId ? `portfolionl_${userId}_snapshots` : null;
}

export function loadSnapshots(userId: string | null | undefined): Snapshot[] {
  const key = snapshotKey(userId);
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as Snapshot[]; }
  catch { return []; }
}

export function saveSnapshot(userId: string | null | undefined, snap: Snapshot): void {
  const key = snapshotKey(userId);
  if (!key) return;
  const existing = loadSnapshots(userId);
  const idx = existing.findIndex((s) => s.datum === snap.datum);
  if (idx >= 0) { existing[idx] = snap; } else { existing.push(snap); }
  // Sort ascending, trim to max
  existing.sort((a, b) => a.datum.localeCompare(b.datum));
  const trimmed = existing.slice(-MAX_SNAPSHOTS);
  try { localStorage.setItem(key, JSON.stringify(trimmed)); } catch {}
}

export function filterSnapshots(snapshots: Snapshot[], period: "1W" | "1M" | "3M" | "6M" | "1J" | "Alles"): Snapshot[] {
  if (period === "Alles" || snapshots.length === 0) return snapshots;
  const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1J": 365 }[period];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutStr = cutoff.toISOString().slice(0, 10);
  return snapshots.filter((s) => s.datum >= cutStr);
}

/** Vindt de dichtstbijzijnde snapshot voor of op een gegeven datum. */
function closestBefore(snapshots: Snapshot[], datum: string): Snapshot | null {
  const candidates = snapshots.filter((s) => s.datum <= datum);
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

export interface PeriodeRendement {
  label: string;
  rendementEUR: number | null;
  rendementPct: number | null;
  beschikbaar: boolean;
}

export function berekeningPeriodes(snapshots: Snapshot[], huidigWaarde: number): PeriodeRendement[] {
  const today = new Date().toISOString().slice(0, 10);

  function maakDatum(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  }

  function eersteDagWeek(): string {
    const d = new Date();
    const dag = d.getDay(); // 0=zo, 1=ma
    const offset = dag === 0 ? 6 : dag - 1; // dagen tot maandag
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  }

  function eersteDagMaand(): string {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }

  function eersteDagJaar(): string {
    const d = new Date();
    d.setMonth(0, 1);
    return d.toISOString().slice(0, 10);
  }

  function berekening(snap: Snapshot | null): { rendementEUR: number; rendementPct: number } | null {
    if (!snap) return null;
    const rEur = huidigWaarde - snap.totaalWaarde;
    const rPct = snap.totaalWaarde > 0 ? (rEur / snap.totaalWaarde) * 100 : 0;
    return { rendementEUR: rEur, rendementPct: rPct };
  }

  const gisteren  = closestBefore(snapshots, maakDatum(1));
  const maandag   = closestBefore(snapshots, eersteDagWeek());
  const eersteM   = closestBefore(snapshots, eersteDagMaand());
  const eersteJ   = closestBefore(snapshots, eersteDagJaar());
  const allereerste = snapshots.length > 0 ? snapshots[0] : null;

  const todaySnap = closestBefore(snapshots, today);

  return [
    { label: "Vandaag",    ...spread(berekening(gisteren)),  beschikbaar: !!gisteren },
    { label: "Deze week",  ...spread(berekening(maandag)),   beschikbaar: !!maandag },
    { label: "Deze maand", ...spread(berekening(eersteM)),   beschikbaar: !!eersteM },
    { label: "Dit jaar",   ...spread(berekening(eersteJ)),   beschikbaar: !!eersteJ },
    { label: "Totaal",     ...spread(berekening(allereerste)),beschikbaar: !!allereerste },
  ];
  void todaySnap;
}

function spread(r: { rendementEUR: number; rendementPct: number } | null): { rendementEUR: number | null; rendementPct: number | null } {
  return r ? { rendementEUR: r.rendementEUR, rendementPct: r.rendementPct } : { rendementEUR: null, rendementPct: null };
}

export interface PortfolioStatistieken {
  allTimeHigh: number;
  allTimeLow: number;
  besteDag: { datum: string; verandering: number } | null;
  slechteDag: { datum: string; verandering: number } | null;
  dagenPositief: number;
  dagenNegatief: number;
}

export function berekenStatistieken(snapshots: Snapshot[]): PortfolioStatistieken {
  if (snapshots.length === 0) {
    return { allTimeHigh: 0, allTimeLow: 0, besteDag: null, "slechteDag": null, dagenPositief: 0, dagenNegatief: 0 };
  }

  let allTimeHigh = -Infinity;
  let allTimeLow  =  Infinity;
  let besteDag: { datum: string; verandering: number } | null = null;
  let slechtste_Dag: { datum: string; verandering: number } | null = null;
  let dagenPositief = 0;
  let dagenNegatief = 0;

  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    if (s.totaalWaarde > allTimeHigh) allTimeHigh = s.totaalWaarde;
    if (s.totaalWaarde < allTimeLow)  allTimeLow  = s.totaalWaarde;

    if (i > 0) {
      const prev = snapshots[i - 1];
      const change = s.totaalWaarde - prev.totaalWaarde;
      if (!besteDag || change > besteDag.verandering) besteDag = { datum: s.datum, verandering: change };
      if (!slechtste_Dag || change < slechtste_Dag.verandering) slechtste_Dag = { datum: s.datum, verandering: change };
      if (change >= 0) dagenPositief++; else dagenNegatief++;
    }
  }

  return {
    allTimeHigh,
    allTimeLow,
    besteDag,
    "slechteDag": slechtste_Dag,
    dagenPositief,
    dagenNegatief,
  };
}
