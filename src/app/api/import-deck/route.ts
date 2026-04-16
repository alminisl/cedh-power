import { NextRequest, NextResponse } from "next/server";

function parseMoxfieldId(url: string): string | null {
  const m = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseArchidektId(url: string): string | null {
  const m = url.match(/archidekt\.com\/decks\/(\d+)/);
  return m ? m[1] : null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  const moxfieldId = parseMoxfieldId(url);
  if (moxfieldId) {
    try {
      const res = await fetch(`https://api.moxfield.com/v2/decks/all/${moxfieldId}`, {
        headers: { "User-Agent": "cEDH-Power-Simple/1.0 (https://cedh-power.com)" },
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Deck not found on Moxfield" }, { status: 404 });
      }
      const data = await res.json();
      const lines: string[] = [];
      for (const [name] of Object.entries(data.commanders ?? {})) {
        lines.push(`1 ${name}`);
      }
      for (const [name, info] of Object.entries(data.mainboard ?? {}) as [string, { quantity: number }][]) {
        lines.push(`${info.quantity} ${name}`);
      }
      return NextResponse.json({ decklist: lines.join("\n") });
    } catch {
      return NextResponse.json({ error: "Failed to fetch from Moxfield" }, { status: 502 });
    }
  }

  const archidektId = parseArchidektId(url);
  if (archidektId) {
    try {
      const res = await fetch(`https://archidekt.com/api/decks/${archidektId}/`, {
        headers: { "User-Agent": "cEDH-Power-Simple/1.0" },
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Deck not found on Archidekt" }, { status: 404 });
      }
      const data = await res.json();
      // Archidekt uses custom category names ("Ramp", "Mill", "Removal", etc.) —
      // never a literal "Mainboard". Include everything except Commander/Sideboard/Maybeboard.
      const EXCLUDED = new Set(["Sideboard", "Maybeboard", "Maybe Board", "Side Board"]);
      const commanders: string[] = [];
      const mainboard: string[] = [];
      for (const card of data.cards ?? []) {
        const name = card.card?.oracleCard?.name ?? card.name;
        const qty = card.quantity ?? 1;
        const cats: string[] = card.categories ?? [];
        if (cats.includes("Commander")) {
          commanders.push(`1 ${name}`);
        } else if (!cats.some((c: string) => EXCLUDED.has(c))) {
          mainboard.push(`${qty} ${name}`);
        }
      }
      return NextResponse.json({ decklist: [...commanders, ...mainboard].join("\n") });
    } catch {
      return NextResponse.json({ error: "Failed to fetch from Archidekt" }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: "Unsupported URL — paste a Moxfield or Archidekt deck link" },
    { status: 400 }
  );
}
