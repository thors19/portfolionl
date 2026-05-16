"use client";

import { v4 as uuidv4 } from "uuid";
import { marked } from "marked";

export interface BlogArticle {
  id: string;
  slug: string;
  titel: string;
  samenvatting: string;
  inhoud: string;        // HTML (TipTap output)
  categorie: string;
  tags: string[];
  datum: string;         // ISO date string
  gepubliceerd: boolean;
  leestijd: number;      // minutes
  auteur: string;
}

const STORAGE_KEY = "portfolionl_blog_articles";
const SEEDED_KEY  = "portfolionl_blog_seeded";

// Seed articles: converted from the markdown files
const SEED_ARTICLES: Omit<BlogArticle, "id">[] = [
  {
    slug: "vwrl-vs-vdiv-vergelijking",
    titel: "VWRL vs VDIV: welk dividend ETF past bij jou?",
    samenvatting: "Twee van de populairste ETFs voor Nederlandse beleggers vergeleken. We kijken naar kosten, dividend, spreiding en fiscale behandeling.",
    categorie: "ETFs",
    tags: ["etf", "dividend", "vwrl", "vdiv", "beleggen"],
    datum: "2026-05-01",
    gepubliceerd: true,
    leestijd: 8,
    auteur: "PortfolioNL",
    inhoud: `<h2>Inleiding</h2><p>Als Nederlandse belegger kom je al snel de namen <strong>VWRL</strong> en <strong>VDIV</strong> tegen. Beide zijn populaire ETFs van Vanguard, maar ze hebben fundamenteel verschillende doelstellingen.</p><h2>Wat is VWRL?</h2><p><strong>Vanguard FTSE All-World UCITS ETF (VWRL)</strong> is een ETF die belegt in aandelen wereldwijd. Het fonds volgt de FTSE All-World Index met meer dan 4.000 aandelen.</p><ul><li><strong>TER:</strong> 0,22% per jaar</li><li><strong>Dividend:</strong> ~1,5–2% per jaar</li><li><strong>Spreiding:</strong> 4.000+ aandelen, 50+ landen</li></ul><h2>Wat is VDIV?</h2><p><strong>Vanguard FTSE All-World High Dividend Yield UCITS ETF (VDIV)</strong> richt zich op aandelen met een hoog dividendrendement.</p><ul><li><strong>TER:</strong> 0,29% per jaar</li><li><strong>Dividend:</strong> ~3,5–4,5% per jaar</li><li><strong>Spreiding:</strong> ~1.900 aandelen</li></ul><h2>Wanneer kies je voor VWRL?</h2><p>✅ Je bent jong en wilt vermogen opbouwen<br>✅ Je wilt brede spreiding inclusief tech/groei<br>✅ Je wilt de laagste kosten</p><h2>Wanneer kies je voor VDIV?</h2><p>✅ Je hebt passief inkomen nodig<br>✅ Je wilt regelmatige cashflow<br>✅ Je bent al met pensioen</p><blockquote><p>Disclaimer: dit artikel is geen financieel advies.</p></blockquote>`,
  },
  {
    slug: "box3-uitleg-beleggers",
    titel: "Box 3 uitgelegd voor beleggers: wat betaal je echt?",
    samenvatting: "Box 3 is voor veel beleggers een mysterie. We leggen uit hoe het forfaitaire stelsel werkt en hoe je je belastingaangifte optimaliseert.",
    categorie: "Fiscaal",
    tags: ["box3", "belasting", "vermogensbelasting", "fiscaal", "nederland"],
    datum: "2026-05-05",
    gepubliceerd: true,
    leestijd: 10,
    auteur: "PortfolioNL",
    inhoud: `<h2>Wat is Box 3?</h2><p>Box 3 is het onderdeel van de Nederlandse inkomstenbelasting dat betrekking heeft op <strong>vermogen</strong>: spaargeld, beleggingen en andere bezittingen.</p><h2>Het forfaitaire stelsel (2025)</h2><p>Fictief rendement per categorie:</p><ul><li>Banktegoeden: 1,51%</li><li>Beleggingen: 6,03%</li><li>Schulden: 2,25%</li></ul><p>Over het fictieve rendement betaal je <strong>36% belasting</strong>.</p><h2>Heffingvrij vermogen</h2><p>Je betaalt geen belasting over de eerste <strong>€ 57.000</strong> (2025). Met fiscaal partner: <strong>€ 114.000</strong>.</p><h2>Tips voor beleggers</h2><ul><li>Gebruik de peildatum (1 januari)</li><li>Fiscaal partnerschap optimaal benutten</li><li>Schulden verrekenen (drempel € 3.400)</li><li>Groen beleggen voor extra vrijstelling</li></ul><blockquote><p>Disclaimer: dit artikel is geen financieel advies. Raadpleeg een belastingadviseur.</p></blockquote>`,
  },
  {
    slug: "edelmetalen-in-je-portfolio",
    titel: "Waarom edelmetalen horen in een gespreide portefeuille",
    samenvatting: "Goud, zilver, platina en palladium bieden bescherming tegen inflatie en marktvolatiliteit.",
    categorie: "Edelmetalen",
    tags: ["goud", "zilver", "platina", "spreiding", "inflatie"],
    datum: "2026-05-08",
    gepubliceerd: true,
    leestijd: 7,
    auteur: "PortfolioNL",
    inhoud: `<h2>De rol van edelmetalen</h2><p>Edelmetalen vervullen drie functies in een portefeuille:</p><ol><li><strong>Inflatiehedge</strong> — goud behoudt koopkracht</li><li><strong>Diversificatie</strong> — lage correlatie met aandelen</li><li><strong>Veilige haven</strong> — bij onzekerheid stijgt de vraag</li></ol><h2>Goud</h2><p>De klassieke veilige haven. Prijs wordt bepaald door rente, dollarkracht en geopolitiek.</p><h2>Zilver</h2><p>Goedkoper alternatief met industrieel gebruik (zonnepanelen, elektronica).</p><h2>Hoeveel in je portefeuille?</h2><ul><li>Defensief: 10-15%</li><li>Gebalanceerd: 5-10%</li><li>Offensief: 2-5%</li></ul><blockquote><p>Disclaimer: dit artikel is geen financieel advies.</p></blockquote>`,
  },
  {
    slug: "dividend-beleggen-strategie",
    titel: "Dividend beleggen: een strategie voor passief inkomen",
    samenvatting: "Dividend beleggen kan een stabiele inkomstenstroom genereren. We bespreken de strategie en de beste dividendaandelen.",
    categorie: "Strategie",
    tags: ["dividend", "passief inkomen", "strategie", "aandelen"],
    datum: "2026-05-10",
    gepubliceerd: true,
    leestijd: 9,
    auteur: "PortfolioNL",
    inhoud: `<h2>Wat is dividend beleggen?</h2><p>Dividend beleggen is een strategie waarbij je aandelen koopt van bedrijven die regelmatig een deel van hun winst uitkeren.</p><h2>De kracht van herinvestering</h2><p>Door dividend te herinvesteren profiteer je van <strong>samengesteld rendement</strong>.</p><h2>Populaire dividendaandelen</h2><ul><li>Shell (SHELL.AS) — ~4%</li><li>ING Groep (INGA.AS) — ~7%</li><li>NN Group (NN.AS) — ~6%</li></ul><h2>Dividend Aristocrats</h2><p>Bedrijven die minimaal 25 jaar hun dividend verhoogd hebben: Coca-Cola, Johnson &amp; Johnson, Procter &amp; Gamble.</p><blockquote><p>Disclaimer: dit artikel is geen financieel advies.</p></blockquote>`,
  },
  {
    slug: "crypto-in-je-portfolio",
    titel: "Crypto als onderdeel van je beleggingsportefeuille",
    samenvatting: "Crypto biedt hoge rendementen maar ook hoge risico's. Hoe neem je crypto verantwoord op in je portefeuille?",
    categorie: "Crypto",
    tags: ["crypto", "bitcoin", "ethereum", "spreiding", "risico"],
    datum: "2026-05-12",
    gepubliceerd: true,
    leestijd: 8,
    auteur: "PortfolioNL",
    inhoud: `<h2>Crypto als asset class</h2><p>Na meer dan een decennium is crypto niet meer weg te denken als beleggingscategorie.</p><h2>Hoeveel crypto?</h2><ul><li>Conservatief: 0-2%</li><li>Gebalanceerd: 2-5%</li><li>Offensief: 5-15%</li></ul><h2>Risico's</h2><ul><li><strong>Volatiliteit</strong> — koersdalingen van 50-80% zijn historisch niet ongewoon</li><li><strong>Regulering</strong> — MiCA in de EU</li><li><strong>Technisch risico</strong> — verlies van private key</li></ul><h2>Veilig bewaren</h2><p>Hardware wallet (Ledger, Trezor) aanbevolen bij meer dan € 1.000 aan crypto.</p><blockquote><p>Disclaimer: dit artikel is geen financieel advies.</p></blockquote>`,
  },
];

export function calculateLeestijd(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function generateSlug(titel: string): string {
  return titel
    .toLowerCase()
    .replace(/[àáäâ]/g, "a").replace(/[èéëê]/g, "e")
    .replace(/[ìíïî]/g, "i").replace(/[òóöô]/g, "o")
    .replace(/[ùúüû]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// Convert markdown to HTML for seed articles
async function mdToHtml(md: string): Promise<string> {
  return marked(md) as string;
}

export function getAllArticles(): BlogArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BlogArticle[]) : [];
  } catch { return []; }
}

export function saveAllArticles(articles: BlogArticle[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); } catch {}
}

export function getPublishedArticles(): BlogArticle[] {
  return getAllArticles()
    .filter((a) => a.gepubliceerd)
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

export function getArticleBySlug(slug: string): BlogArticle | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null;
}

export function getArticleById(id: string): BlogArticle | null {
  return getAllArticles().find((a) => a.id === id) ?? null;
}

export function saveArticle(article: BlogArticle): void {
  const all = getAllArticles();
  const idx = all.findIndex((a) => a.id === article.id);
  if (idx >= 0) { all[idx] = article; } else { all.push(article); }
  saveAllArticles(all);
}

export function deleteArticle(id: string): void {
  saveAllArticles(getAllArticles().filter((a) => a.id !== id));
}

export function togglePublish(id: string): void {
  const all = getAllArticles();
  const art = all.find((a) => a.id === id);
  if (art) { art.gepubliceerd = !art.gepubliceerd; saveAllArticles(all); }
}

export async function seedIfEmpty(): Promise<void> {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const existing = getAllArticles();
  if (existing.length > 0) { localStorage.setItem(SEEDED_KEY, "1"); return; }

  const seeded: BlogArticle[] = await Promise.all(
    SEED_ARTICLES.map(async (a) => ({
      ...a,
      id: uuidv4(),
      inhoud: a.inhoud, // already HTML
    }))
  );
  saveAllArticles(seeded);
  localStorage.setItem(SEEDED_KEY, "1");
}

void mdToHtml; // suppress unused warning
