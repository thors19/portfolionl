import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

const SYSTEM_PROMPT = `Je bent een financiële schrijver voor PortfolioNL, een Nederlandse portfolio tracker voor DEGIRO beleggers.

Schrijf heldere, eerlijke en praktische artikelen in het Nederlands. Geen hype, wel nuance. Gebruik concrete voorbeelden en cijfers waar mogelijk.

Structuur:
- Begin met een korte inleiding (1-2 alinea's)
- Gebruik H2 en H3 koppen voor structuur
- Gebruik bullet points en tabellen waar relevant
- Eindig altijd met een conclusie
- Voeg altijd een disclaimer toe: "Disclaimer: Dit artikel is puur informatief en geen financieel advies. Raadpleeg een financieel adviseur voor persoonlijk advies."

Schrijf in Markdown formaat.`;

export async function POST(request: NextRequest) {
  // Auth check — admin only
  const { userId } = await auth();
  if (!userId || (ADMIN_USER_ID && userId !== ADMIN_USER_ID)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY niet geconfigureerd" }, { status: 500 });
  }

  let body: { onderwerp: string; toon: string; doelgroep: string; lengte: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige request" }, { status: 400 });
  }

  const { onderwerp, toon, doelgroep, lengte } = body;

  const lengteMap: Record<string, string> = {
    kort: "600-800 woorden",
    middel: "1000-1400 woorden",
    lang: "1800-2400 woorden",
  };

  const toonMap: Record<string, string> = {
    informatief: "informatief en objectief, met feiten en cijfers",
    toegankelijk: "toegankelijk en begrijpelijk voor beginners, vermijd jargon",
    diepgaand: "diepgaand en analytisch, voor gevorderde beleggers",
  };

  const userPrompt = `Schrijf een artikel over: "${onderwerp}"

Toon: ${toonMap[toon] ?? toon}
Doelgroep: ${doelgroep || "Nederlandse particuliere beleggers via DEGIRO"}
Lengte: ${lengteMap[lengte] ?? lengte}

Schrijf een volledig, gepubliceerbaar artikel in Markdown formaat.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Onverwacht antwoord van AI" }, { status: 500 });
    }

    return NextResponse.json({ markdown: content.text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generatie mislukt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
