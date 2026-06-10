import { NextRequest, NextResponse } from "next/server";

const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";

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

    // All cards already cached — return immediately
    if (toFetch.length === 0) {
      return NextResponse.json({ data: cached, not_found: [] });
    }

    const seen = new Set<string>();
    const fresh: unknown[] = [];
    let stillNeeded = toFetch.map((i) => i.name);

    // Primary: brackend
    try {
      const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": APP_ORIGIN },
        body: JSON.stringify({ names: stillNeeded }),
      });

      if (res.ok) {
        const data = await res.json();
        // Deduplicate by name; normalize set_code → set to match ScryfallCardData shape
        for (const card of data.cards ?? []) {
          if (seen.has(card.name)) continue;
          seen.add(card.name);
          const normalized = { ...card, set: card.set_code ?? card.set };
          serverCache.set(card.name, { data: normalized, ts: now });
          fresh.push(normalized);
        }
        stillNeeded = stillNeeded.filter((n) => !seen.has(n));
      }
    } catch {
      // fall through to Scryfall
    }

    // Fallback: Scryfall collection for anything brackend didn't return
    if (stillNeeded.length > 0) {
      try {
        const sfRes = await fetch("https://api.scryfall.com/cards/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiers: stillNeeded.map((name) => ({ name })) }),
        });

        if (sfRes.ok) {
          const sfData = await sfRes.json();
          for (const card of sfData.data ?? []) {
            if (seen.has(card.name)) continue;
            seen.add(card.name);
            serverCache.set(card.name, { data: card, ts: now });
            fresh.push(card);
          }
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      data: [...cached, ...fresh],
      not_found: [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
