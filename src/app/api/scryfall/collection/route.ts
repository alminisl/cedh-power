import { NextRequest, NextResponse } from "next/server";

// Server-side per-card cache — survives across requests within the same process
const serverCache = new Map<string, { data: unknown; ts: number }>();
const SERVER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifiers: { name: string }[] = body.identifiers ?? [];

    const now = Date.now();
    const cached: unknown[] = [];
    const toFetch: { name: string }[] = [];

    for (const id of identifiers) {
      const entry = serverCache.get(id.name);
      if (entry && now - entry.ts < SERVER_CACHE_TTL) {
        cached.push(entry.data);
      } else {
        toFetch.push(id);
      }
    }

    // All cards already cached — return immediately, no Scryfall call
    if (toFetch.length === 0) {
      return NextResponse.json({ data: cached, not_found: [] });
    }

    const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: toFetch.map((i) => i.name) }),
    });

    if (!res.ok) {
      // Return whatever we have from cache, pass through the status code
      return NextResponse.json(
        { data: cached, not_found: [], error: res.statusText },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Deduplicate by name (bulk-by-names returns multiple printings per name),
    // then normalize set_code → set to match ScryfallCardData shape
    const seen = new Set<string>();
    const fresh: unknown[] = [];
    for (const card of data.cards ?? []) {
      if (seen.has(card.name)) continue;
      seen.add(card.name);
      const normalized = { ...card, set: card.set_code ?? card.set };
      serverCache.set(card.name, { data: normalized, ts: now });
      fresh.push(normalized);
    }

    return NextResponse.json(
      { data: [...cached, ...fresh], not_found: [] },
      {
        headers: {
          // Card data is stable — cache at CDN for 24h
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          "Netlify-CDN-Cache-Control": "public, s-maxage=86400",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
