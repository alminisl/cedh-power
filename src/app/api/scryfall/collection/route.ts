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

    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: toFetch }),
    });

    if (!res.ok) {
      // Return whatever we have from cache, pass through the status code
      return NextResponse.json(
        { data: cached, not_found: [], error: res.statusText },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Store freshly fetched cards in server cache
    for (const card of data.data ?? []) {
      serverCache.set(card.name, { data: card, ts: now });
    }

    return NextResponse.json({
      data: [...cached, ...(data.data ?? [])],
      not_found: data.not_found ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
